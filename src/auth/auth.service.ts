import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleProfile } from './types';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'none' | 'lax';
  maxAge: number;
  path: string;
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

  getCookieOptions(): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };
  }

  async handleOAuthCallback(profile: GoogleProfile | null): Promise<OAuthCallbackResult> {
    const clientUrl = this.getClientUrl();

    if (!profile) {
      throw new Error('No user profile found');
    }

    const user = await this.validateOAuthLogin(profile);
    const token = this.generateToken(user.email);
    const cookieOptions = this.getCookieOptions();

    try {
      const domain = new URL(clientUrl).hostname;
      console.log('Cookie set for domain:', domain);
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
