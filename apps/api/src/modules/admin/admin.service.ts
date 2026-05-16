import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ---- Users (org-wide) ----
  async listUsers(organizationId: string, query: { page?: number; pageSize?: number; search?: string }) {
    const { page = 1, pageSize = 20, search } = query;
    const where = {
      organizationId,
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
        include: { roles: { include: { role: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ---- Roles & Permissions ----
  async listRoles(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async createRole(organizationId: string, dto: { name: string; description?: string }) {
    return this.prisma.role.create({ data: { ...dto, organizationId } });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { resource: 'asc' } });
  }

  async assignPermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
  }

  async removePermission(roleId: string, permissionId: string) {
    await this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
    return { message: 'Permission removed' };
  }

  // ---- API Keys ----
  async listApiKeys(organizationId: string) {
    return this.prisma.apiKey.findMany({
      where: { organizationId },
      select: { id: true, name: true, prefix: true, scopes: true, expiresAt: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createApiKey(organizationId: string, createdById: string, dto: {
    name: string; scopes?: string[]; expiresAt?: string;
  }) {
    const { randomBytes } = await import('crypto');
    const rawKey = randomBytes(32).toString('hex');
    const prefix = rawKey.slice(0, 8);
    const { createHash } = await import('crypto');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        prefix,
        keyHash,
        scopes: dto.scopes ?? [],
        organizationId,
        createdById,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    return { ...apiKey, key: `nat_${rawKey}` }; // Return raw key only once
  }

  async revokeApiKey(id: string, organizationId: string) {
    await this.prisma.apiKey.updateMany({
      where: { id, organizationId },
      data: { revokedAt: new Date() },
    });
    return { message: 'API key revoked' };
  }

  // ---- Audit Log ----
  async getAuditLog(organizationId: string, query: { page?: number; pageSize?: number; userId?: string }) {
    const { page = 1, pageSize = 50, userId } = query;
    const where = { organizationId, ...(userId && { userId }) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ---- Settings ----
  async getSettings(organizationId: string) {
    return this.prisma.setting.findMany({ where: { organizationId } });
  }

  async upsertSetting(organizationId: string, key: string, value: string) {
    return this.prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, value },
      update: { value },
    });
  }
}
