import { Module } from '@sker/core';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';

@Module({
  providers: [{ provide: AuthService, useClass: AuthService }],
  features: [AuthController],
})
export class AuthModule {}
