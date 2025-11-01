import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleProfile } from './types';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'none' | 'lax' | 'strict';
  maxAge: number;
  path: string;
  domain?: string;
}

export interface OAuthCallbackResult {
  token: string;
  cookieOptions: CookieOptions;
  redirectUrl: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateOAuthLogin(profile: GoogleProfile) {
    const email = profile.email;
    if (!email) {
      throw new Error('No email found in Google profile');
    }

    let user = await this.prisma.user.findUnique({ where: { email } });
    const now = new Date();

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: profile.firstName || '',
          image: profile.picture,
          provider: 'google',
          providerId: profile.accessToken,
          lastLogin: now,
          loginHistory: {
            create: [
              {
                loginAt: now,
                provider: 'google',
              },
            ],
          },
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { email },
        data: {
          lastLogin: now,
          loginHistory: {
            create: {
              loginAt: now,
              provider: 'google',
            },
          },
        },
      });
    }

    return user;
  }

  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        lastLogin: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  verifyToken(token: string): { email: string } {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  generateToken(email: string): string {
    return this.jwtService.sign({ email });
  }

  getClientUrl(): string {
    return process.env.CLIENT_URL || 'http://localhost:3000';
  }

  getCookieOptions(clientUrl?: string): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    const isCrossOrigin = this.isCrossOriginRequest(clientUrl);
    const isLocalhost = this.isLocalhost(clientUrl);
    
     
    let secure: boolean;
    let sameSite: 'none' | 'lax' | 'strict';
    
    if (isCrossOrigin) {
      
      sameSite = 'none';
      secure = true;
    } else {
      sameSite = 'lax';
      secure = isProduction;
    }
    
    const options: CookieOptions = {
      httpOnly: true,
      secure: secure,
      sameSite: sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    };
    return options;
  }

  private isLocalhost(clientUrl?: string): boolean {
    if (!clientUrl) {
      clientUrl = this.getClientUrl();
    }

    try {
      const url = new URL(clientUrl);
      return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    } catch (err) {
      return false;
    }
  }

  private isCrossOriginRequest(clientUrl?: string): boolean {
    if (!clientUrl) {
      clientUrl = this.getClientUrl();
    }

    try {
      const frontendUrl = new URL(clientUrl);
      const backendUrl = process.env.BACKEND_BASE_URL || 'http://localhost:3001';
      const backendUrlObj = new URL(backendUrl);
      
     
      return (
        frontendUrl.protocol !== backendUrlObj.protocol ||
        frontendUrl.hostname !== backendUrlObj.hostname ||
        frontendUrl.port !== backendUrlObj.port
      );
    } catch (err) {
      return true;
    }
  }

  async handleOAuthCallback(profile: GoogleProfile | null): Promise<OAuthCallbackResult> {
    const clientUrl = this.getClientUrl();

    if (!profile) {
      throw new Error('No user profile found');
    }

    const user = await this.validateOAuthLogin(profile);
    const token = this.generateToken(user.email);
    
    const cookieOptions = this.getCookieOptions(clientUrl);

    try {
      const domain = new URL(clientUrl).hostname;
      const isCrossOrigin = this.isCrossOriginRequest(clientUrl);
      console.log('Cookie set for domain:', domain, 'Cross-origin:', isCrossOrigin);
    } catch (err) {
      console.error('Invalid CLIENT_URL format:', err);
    }

    return {
      token,
      cookieOptions,
      redirectUrl: `${clientUrl}/auth/success`,
    };
  }
}
