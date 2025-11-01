import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getBackendStatus(): { status: string } {
    return { status: 'Backend is working!' };
  }
}
