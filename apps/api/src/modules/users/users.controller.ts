import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, AssignRoleDto } from './dto/user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users in organization' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.usersService.findAll(orgId, { search, page, pageSize, departmentId });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  getMe(@CurrentUser('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.usersService.findById(id, orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.usersService.findById(id, orgId);
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a new user' })
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(orgId, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change own password' })
  changePassword(@CurrentUser('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, orgId, dto);
  }

  @Post(':id/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign role to user' })
  assignRole(
    @Param('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(userId, dto.roleId, orgId);
  }

  @Delete(':id/roles/:roleId')
  @Roles('admin')
  @ApiOperation({ summary: 'Remove role from user' })
  removeRole(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.usersService.removeRole(userId, roleId, orgId);
  }

  @Patch(':id/deactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Deactivate user' })
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.usersService.deactivate(id, orgId);
  }
}
