import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  jobTitle: true,
  phone: true,
  status: true,
  emailVerified: true,
  mfaEnabled: true,
  organizationId: true,
  departmentId: true,
  locationId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  roles: { include: { role: true } },
  department: true,
  location: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    query: { search?: string; page?: number; pageSize?: number; departmentId?: string },
  ) {
    const { search, page = 1, pageSize = 20, departmentId } = query;
    const where = {
      organizationId,
      ...(departmentId && { departmentId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findById(id: string, organizationId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException('User not found');
    if (organizationId && user.organizationId !== organizationId)
      throw new ForbiddenException('Access denied');
    return user;
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = dto.password ? await argon2.hash(dto.password) : undefined;
    const memberRole = await this.prisma.role.findFirst({ where: { name: 'member' } });

    return this.prisma.user.create({
      data: {
        ...dto,
        email: dto.email.toLowerCase(),
        organizationId,
        passwordHash,
        password: undefined,
        ...(memberRole && { roles: { create: { roleId: memberRole.id } } }),
      },
      select: USER_SELECT,
    });
  }

  async update(id: string, organizationId: string, dto: UpdateUserDto) {
    await this.findById(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (!user.passwordHash) throw new ForbiddenException('OAuth-only account');
    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new ForbiddenException('Current password is incorrect');
    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    // Invalidate all sessions
    await this.prisma.session.deleteMany({ where: { userId: id } });
    return { message: 'Password changed. Please log in again.' };
  }

  async assignRole(userId: string, roleId: string, organizationId: string) {
    await this.findById(userId, organizationId);
    await this.prisma.role.findUniqueOrThrow({ where: { id: roleId } });
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId },
      update: {},
    });
    return this.findById(userId);
  }

  async removeRole(userId: string, roleId: string, organizationId: string) {
    await this.findById(userId, organizationId);
    await this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
    return this.findById(userId);
  }

  async deactivate(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: USER_SELECT,
    });
  }
}
