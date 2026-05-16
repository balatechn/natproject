import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus,
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

  @Get('users')
  listUsers(
    @CurrentUser('organizationId') orgId: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.adminService.listUsers(orgId, { search, page, pageSize });
  }

  // Roles
  @Get('roles')
  listRoles(@CurrentUser('organizationId') orgId: string) {
    return this.adminService.listRoles(orgId);
  }

  @Post('roles')
  createRole(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: { name: string; description?: string },
  ) {
    return this.adminService.createRole(orgId, dto);
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

  // API Keys
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

  // Audit log
  @Get('audit-log')
  getAuditLog(
    @CurrentUser('organizationId') orgId: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.adminService.getAuditLog(orgId, { userId, page, pageSize });
  }

  // Settings
  @Get('settings')
  getSettings(@CurrentUser('organizationId') orgId: string) {
    return this.adminService.getSettings(orgId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Upsert setting key/value' })
  upsertSetting(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { key: string; value: string },
  ) {
    return this.adminService.upsertSetting(orgId, body.key, body.value);
  }
}
