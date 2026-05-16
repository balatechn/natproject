import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, VerifyMfaDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, req.ip, req.headers['user-agent']);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...response } = result;
    return response;
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user (first user becomes admin)' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...response } = result;
    return response;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie or body' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: Partial<RefreshTokenDto>,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)?.refresh_token ?? body.refreshToken;
    if (!refreshToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No refresh token' });
      return;
    }

    // Decode sub from refresh token without full validation to get userId
    const decoded = this.decodeJwtPayload(refreshToken);
    if (!decoded?.sub) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid refresh token' });
      return;
    }

    const result = await this.authService.refreshTokens(decoded.sub, refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...response } = result;
    return response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — invalidate session' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)?.refresh_token;
    await this.authService.logout(userId, refreshToken);
    res.clearCookie('refresh_token');
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  me(@CurrentUser() user: unknown) {
    return user;
  }

  @Post('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate MFA secret + QR code URL' })
  setupMfa(@CurrentUser('id') userId: string) {
    return this.authService.setupMfa(userId);
  }

  @Post('mfa/enable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable MFA after verifying TOTP code' })
  enableMfa(@CurrentUser('id') userId: string, @Body() dto: VerifyMfaDto) {
    return this.authService.enableMfa(userId, dto.code);
  }

  @Post('mfa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  disableMfa(@CurrentUser('id') userId: string, @Body() dto: VerifyMfaDto) {
    return this.authService.disableMfa(userId, dto.code);
  }

  // ---- Helpers ----
  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
  }

  private decodeJwtPayload(token: string): Record<string, string> | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, string>;
    } catch {
      return null;
    }
  }
}
