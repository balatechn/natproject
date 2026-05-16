import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';

import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const makePrisma = () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  session: { create: jest.fn(), deleteMany: jest.fn() },
  organization: { findFirst: jest.fn(), create: jest.fn() },
  role: { upsert: jest.fn() },
  activityLog: { create: jest.fn() },
  $transaction: jest.fn((ops: unknown[]) =>
    Array.isArray(ops) ? Promise.all(ops) : (ops as () => unknown)(),
  ),
});

const makeJwt = () => ({ signAsync: jest.fn().mockResolvedValue('mock-jwt-token') });
const makeConfig = () => ({
  get: jest.fn((key: string, def?: unknown) => def ?? key),
});

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrisma>;
  let jwt: ReturnType<typeof makeJwt>;

  beforeEach(async () => {
    prisma = makePrisma();
    jwt = makeJwt();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: makeConfig() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── validateLocalUser ────────────────────────────────────────────────────────

  describe('validateLocalUser', () => {
    it('returns null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      expect(await service.validateLocalUser('x@x.com', 'pass')).toBeNull();
    });

    it('returns null when password does not match', async () => {
      const hash = await argon2.hash('correct-password');
      prisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'x@x.com', passwordHash: hash, status: 'ACTIVE', roles: [],
      });
      expect(await service.validateLocalUser('x@x.com', 'wrong-password')).toBeNull();
    });

    it('throws UnauthorizedException when account is inactive', async () => {
      const hash = await argon2.hash('pass');
      prisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'x@x.com', passwordHash: hash, status: 'INACTIVE', roles: [],
      });
      await expect(service.validateLocalUser('x@x.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns user when credentials are valid', async () => {
      const hash = await argon2.hash('correct-password');
      const user = {
        id: '1', email: 'x@x.com', passwordHash: hash, status: 'ACTIVE', roles: [],
      };
      prisma.user.findUnique.mockResolvedValue(user);
      const result = await service.validateLocalUser('x@x.com', 'correct-password');
      expect(result).toMatchObject({ id: '1', email: 'x@x.com' });
    });
  });

  // ── login ────────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws UnauthorizedException on wrong credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@x.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens and user profile on success', async () => {
      const hash = await argon2.hash('pass');
      const fakeUser = {
        id: 'u1',
        email: 'admin@test.com',
        name: 'Admin',
        passwordHash: hash,
        status: 'ACTIVE',
        mfaEnabled: false,
        organizationId: 'org1',
        roles: [{ role: { name: 'admin' } }],
      };
      prisma.user.findUnique.mockResolvedValue(fakeUser);
      prisma.user.update.mockResolvedValue(fakeUser);
      prisma.session.create.mockResolvedValue({});
      prisma.activityLog.create.mockResolvedValue({});
      prisma.$transaction.mockImplementation((ops: unknown[]) =>
        Promise.all((ops as Promise<unknown>[]).map(() => Promise.resolve({}))),
      );
      jwt.signAsync.mockResolvedValue('access-token');

      const result = await service.login({ email: 'admin@test.com', password: 'pass' });

      expect(result).toHaveProperty('accessToken');
      expect(result.user).toMatchObject({ id: 'u1', email: 'admin@test.com' });
    });
  });

  // ── register ─────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({ email: 'exists@test.com', password: 'pass', name: 'X' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a new user and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(0);
      prisma.organization.findFirst.mockResolvedValue({
        id: 'org1', name: 'Org', slug: 'org',
      });
      prisma.role.upsert.mockResolvedValue({ id: 'role1', name: 'admin' });
      prisma.user.create.mockResolvedValue({
        id: 'u2',
        email: 'new@test.com',
        name: 'New User',
        organizationId: 'org1',
        roles: [{ role: { name: 'admin' } }],
      });
      prisma.session.create.mockResolvedValue({});
      jwt.signAsync.mockResolvedValue('new-token');

      const result = await service.register({
        email: 'new@test.com',
        password: 'password123',
        name: 'New User',
      } as any);

      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe('new@test.com');
    });
  });
});
