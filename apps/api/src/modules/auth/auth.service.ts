import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ---- Local validation ----
  async validateLocalUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { roles: { include: { role: true } } },
    });
    if (!user?.passwordHash) return null;
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) return null;
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');
    return user;
  }

  // ---- Login ----
  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.validateLocalUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    if (user.mfaEnabled) {
      if (!dto.mfaCode) throw new BadRequestException('MFA code required');
      const valid = user.mfaSecret
        ? authenticator.verify({ token: dto.mfaCode, secret: user.mfaSecret })
        : false;
      if (!valid) throw new UnauthorizedException('Invalid MFA code');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.organizationId,
      user.roles.map((ur) => ur.role.name),
    );

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      this.prisma.session.create({
        data: {
          userId: user.id,
          refreshToken: await argon2.hash(tokens.refreshToken),
          ipAddress: ip,
          userAgent,
          expiresAt: new Date(
            Date.now() + this.parseDuration(this.config.get('JWT_REFRESH_EXPIRES_IN', '7d')),
          ),
        },
      }),
    ]);

    await this.prisma.activityLog.create({
      data: { userId: user.id, action: 'LOGIN', entityType: 'user', entityId: user.id, ipAddress: ip },
    });

    return {
      accessToken: tokens.accessToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((ur) => ur.role.name),
        organizationId: user.organizationId,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  // ---- Register ----
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password);

    // Create org if provided, else use default
    let org = await this.prisma.organization.findFirst();
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: dto.organizationName ?? 'NAT Organization',
          slug: (dto.organizationName ?? 'nat-org').toLowerCase().replace(/\s+/g, '-'),
        },
      });
    }

    // Ensure default roles exist
    const adminRole = await this.upsertRole('admin');
    const memberRole = await this.upsertRole('member');

    const isFirst = (await this.prisma.user.count()) === 0;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
        organizationId: org.id,
        emailVerified: true, // skip email verification for now
        roles: { create: { roleId: isFirst ? adminRole.id : memberRole.id } },
      },
      include: { roles: { include: { role: true } } },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.organizationId,
      user.roles.map((ur) => ur.role.name),
    );

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: await argon2.hash(tokens.refreshToken),
        expiresAt: new Date(
          Date.now() + this.parseDuration(this.config.get('JWT_REFRESH_EXPIRES_IN', '7d')),
        ),
      },
    });

    return {
      accessToken: tokens.accessToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((ur) => ur.role.name),
        organizationId: user.organizationId,
      },
      refreshToken: tokens.refreshToken,
    };
  }

  // ---- Refresh tokens ----
  async refreshTokens(userId: string, rawRefreshToken: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let validSession = null;
    for (const session of sessions) {
      const match = await argon2.verify(session.refreshToken, rawRefreshToken);
      if (match) { validSession = session; break; }
    }
    if (!validSession) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.organizationId,
      user.roles.map((ur) => ur.role.name),
    );

    await this.prisma.$transaction([
      this.prisma.session.delete({ where: { id: validSession.id } }),
      this.prisma.session.create({
        data: {
          userId: user.id,
          refreshToken: await argon2.hash(tokens.refreshToken),
          expiresAt: new Date(
            Date.now() + this.parseDuration(this.config.get('JWT_REFRESH_EXPIRES_IN', '7d')),
          ),
        },
      }),
    ]);

    return { accessToken: tokens.accessToken, expiresIn: 900, refreshToken: tokens.refreshToken };
  }

  // ---- Logout ----
  async logout(userId: string, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const sessions = await this.prisma.session.findMany({ where: { userId } });
      for (const s of sessions) {
        const match = await argon2.verify(s.refreshToken, rawRefreshToken).catch(() => false);
        if (match) { await this.prisma.session.delete({ where: { id: s.id } }); break; }
      }
    } else {
      await this.prisma.session.deleteMany({ where: { userId } });
    }
  }

  // ---- MFA ----
  async setupMfa(userId: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const otpauthUrl = authenticator.keyuri(user.email, 'NAT Project', secret);
    return { secret, otpauthUrl };
  }

  async enableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) throw new BadRequestException('MFA not set up');
    const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!valid) throw new UnauthorizedException('Invalid MFA code');
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { enabled: true };
  }

  async disableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret || !user.mfaEnabled) throw new BadRequestException('MFA not enabled');
    const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!valid) throw new UnauthorizedException('Invalid MFA code');
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    return { disabled: true };
  }

  // ---- Helpers ----
  private async generateTokens(
    userId: string,
    email: string,
    organizationId: string,
    roles: string[],
  ) {
    const payload = { sub: userId, email, organizationId, roles };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(
        { sub: userId, email },
        {
          secret: this.config.get('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async upsertRole(name: string) {
    return this.prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  private parseDuration(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const [, num, unit] = match;
    const n = parseInt(num, 10);
    const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return n * (multipliers[unit] ?? 1000);
  }

  // ---- Google OAuth (placeholder — full impl in Phase 3) ----
  async handleOAuthLogin(profile: {
    googleId?: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      const org = await this.prisma.organization.findFirst() ??
        await this.prisma.organization.create({
          data: { name: 'NAT Organization', slug: `nat-org-${uuidv4().slice(0, 8)}` },
        });
      const memberRole = await this.upsertRole('member');
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          googleId: profile.googleId,
          emailVerified: true,
          organizationId: org.id,
          roles: { create: { roleId: memberRole.id } },
        },
      });
    } else if (profile.googleId && !user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
      });
    }

    const roles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });
    return this.generateTokens(
      user.id,
      user.email,
      user.organizationId,
      roles.map((r) => r.role.name),
    );
  }
}
