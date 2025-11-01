import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(UnauthorizedException)
export class OAuthExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Only handle OAuth callback routes
    if (request.url?.includes('/callback/google')) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const error = request.query?.error as string | undefined;
      
      if (error) {
        console.log(`OAuth error detected in filter: ${error}. Redirecting to frontend.`);
      } else {
        console.log('OAuth authentication error. Redirecting to frontend.');
      }
      
      return response.redirect(clientUrl);
    }

    // For other routes, use default behavior
    response.status(exception.getStatus()).json(exception.getResponse());
  }
}

