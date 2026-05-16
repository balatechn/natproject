import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'System-wide entity counts' })
  getSystemStats(@CurrentUser('organizationId') orgId: string) {
    return this.adminService.getSystemStats(orgId);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  listUsers(
    @CurrentUser('organizationId') orgId: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.adminService.listUsers(orgId, { search, page, pageSize });
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: Partial<{ status: string; jobTitle: string; departmentId: string }>,
  ) {
    return this.adminService.updateUser(id, orgId, dto);
  }

  @Post('users/:id/roles/:roleId')
  assignUserRole(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.adminService.assignUserRole(userId, orgId, roleId);
  }

  @Delete('users/:id/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  removeUserRole(@Param('id') userId: string, @Param('roleId') roleId: string) {
    return this.adminService.removeUserRole(userId, roleId);
  }

  // ── Roles & Permissions ────────────────────────────────────────────────────

  @Get('roles')
  listRoles() {
    return this.adminService.listRoles();
  }

  @Post('roles')
  createRole(@Body() dto: { name: string; description?: string }) {
    return this.adminService.createRole(dto);
  }

  @Get('permissions')
  listPermissions() {
    return this.adminService.listPermissions();
  }

  @Post('roles/:roleId/permissions/:permId')
  assignPermission(@Param('roleId') roleId: string, @Param('permId') permId: string) {
    return this.adminService.assignPermission(roleId, permId);
  }

  @Delete('roles/:roleId/permissions/:permId')
  @HttpCode(HttpStatus.OK)
  removePermission(@Param('roleId') roleId: string, @Param('permId') permId: string) {
    return this.adminService.removePermission(roleId, permId);
  }

  // ── API Keys ───────────────────────────────────────────────────────────────

  @Get('api-keys')
  listApiKeys(@CurrentUser('organizationId') orgId: string) {
    return this.adminService.listApiKeys(orgId);
  }

  @Post('api-keys')
  createApiKey(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { name: string; scopes?: string[]; expiresAt?: string },
  ) {
    return this.adminService.createApiKey(orgId, userId, dto);
  }

  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.OK)
  revokeApiKey(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.adminService.revokeApiKey(id, orgId);
  }

  // ── Audit Log ──────────────────────────────────────────────────────────────

  @Get('audit-log')
  getAuditLog(
    @CurrentUser('organizationId') orgId: string,
    @Query('userId') userId?: string,
    @Query('resource') resource?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.adminService.getAuditLog(orgId, { userId, resource, page, pageSize });
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  @Get('settings')
  getSettings(@CurrentUser('organizationId') orgId: string) {
    return this.adminService.getSettings(orgId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Upsert a setting key/value pair' })
  upsertSetting(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { key: string; value: unknown },
  ) {
    return this.adminService.upsertSetting(orgId, body.key, body.value);
  }

  @Patch('organization')
  @ApiOperation({ summary: 'Update organization profile' })
  updateOrganization(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: Partial<{ name: string; logoUrl: string; website: string; industry: string }>,
  ) {
    return this.adminService.updateOrganization(orgId, dto);
  }
}