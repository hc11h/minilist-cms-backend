import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { OAuthExceptionFilter } from './filters/oauth-exception.filter';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('me')
  async getProfile(@Req() req) {
    const token = req.cookies['authToken'];
    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = this.authService.verifyToken(token);
    return this.authService.getUserByEmail(payload.email);
  }

  @Get('logout')
  logout(@Res() res: Response) {
    const clientUrl = this.authService.getClientUrl();
    const cookieOptions = this.authService.getCookieOptions(clientUrl);
    res.clearCookie('authToken', cookieOptions);
    return res.status(200).json({ message: 'Logged out successfully' });
  }

  @Get('callback/google')
  @UseFilters(OAuthExceptionFilter)
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req,
    @Res() res: Response,
    @Query('error') error?: string,
  ) {
    const clientUrl = this.authService.getClientUrl();


    if (error) {
      console.log(`OAuth error detected: ${error}. Redirecting to frontend.`);
      return res.redirect(clientUrl);
    }

    try {
      const profile = req.user;
      if (!profile) {
        console.log('No user profile found. Redirecting to frontend.');
        return res.redirect(clientUrl);
      }

      const result = await this.authService.handleOAuthCallback(profile);
      res.cookie('authToken', result.token, result.cookieOptions);
      return res.redirect(result.redirectUrl);
    } catch (err) {
      console.error('Error during OAuth callback:', err);
      return res.redirect(clientUrl);
    }
  }
}
