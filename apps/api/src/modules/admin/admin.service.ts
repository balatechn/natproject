import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── System Stats ─────────────────────────────────────────────────────────────

  async getSystemStats(organizationId: string) {
    const [users, projects, tasks, workflows] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { organizationId } }),
      this.prisma.project.count({ where: { organizationId, isTemplate: false } }),
      this.prisma.task.count({ where: { project: { organizationId } } }),
      this.prisma.workflow.count({ where: { organizationId } }),
    ]);
    return { users, projects, tasks, workflows };
  }

  // ── Users ─────────────────────────────────────────────────────────────────────

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
        omit: { passwordHash: true, mfaSecret: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async updateUser(
    id: string,
    organizationId: string,
    dto: Partial<{ status: string; jobTitle: string; departmentId: string }>,
  ) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: dto,
      omit: { passwordHash: true, mfaSecret: true },
    });
  }

  async assignUserRole(userId: string, organizationId: string, roleId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId },
      update: {},
    });
  }

  async removeUserRole(userId: string, roleId: string) {
    await this.prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
    return { message: 'Role removed' };
  }

  // ── Roles & Permissions ───────────────────────────────────────────────────────

  async listRoles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createRole(dto: { name: string; description?: string }) {
    return this.prisma.role.create({ data: dto });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  async assignPermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
  }

  async removePermission(roleId: string, permissionId: string) {
    await this.prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId } } });
    return { message: 'Permission removed' };
  }

  // ── API Keys ──────────────────────────────────────────────────────────────────

  async listApiKeys(organizationId: string) {
    return this.prisma.apiKey.findMany({
      where: { organizationId, revokedAt: null },
      select: { id: true, name: true, prefix: true, scopes: true, expiresAt: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createApiKey(organizationId: string, createdById: string, dto: { name: string; scopes?: string[]; expiresAt?: string }) {
    const { randomBytes, createHash } = await import('crypto');
    const rawKey = randomBytes(32).toString('hex');
    const prefix = rawKey.slice(0, 8);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId,
        name: dto.name,
        prefix,
        keyHash,
        scopes: dto.scopes ?? [],
        createdBy: createdById,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    return { ...apiKey, key: `nat_${rawKey}` };
  }

  async revokeApiKey(id: string, organizationId: string) {
    await this.prisma.apiKey.updateMany({ where: { id, organizationId }, data: { revokedAt: new Date() } });
    return { message: 'API key revoked' };
  }

  // ── Audit Log ─────────────────────────────────────────────────────────────────

  async getAuditLog(
    organizationId: string,
    query: { page?: number; pageSize?: number; userId?: string; resource?: string },
  ) {
    const { page = 1, pageSize = 50, userId, resource } = query;
    const where = {
      ...(organizationId && { organizationId }),
      ...(userId && { userId }),
      ...(resource && { resource }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ── Organization Settings ─────────────────────────────────────────────────────

  async getSettings(organizationId: string) {
    const [settings, org] = await this.prisma.$transaction([
      this.prisma.setting.findMany({ where: { organizationId }, orderBy: { key: 'asc' } }),
      this.prisma.organization.findUnique({ where: { id: organizationId } }),
    ]);
    return { settings, organization: org };
  }

  async upsertSetting(organizationId: string, key: string, value: unknown) {
    return this.prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, value },
      update: { value },
    });
  }

  async updateOrganization(id: string, dto: Partial<{ name: string; logoUrl: string; website: string; industry: string }>) {
    return this.prisma.organization.update({ where: { id }, data: dto });
  }
}