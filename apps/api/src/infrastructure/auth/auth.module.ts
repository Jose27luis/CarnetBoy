import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ENV } from '../../config/env.module';
import type { Env } from '../../config/env';
import { AccessTokenService } from './access-token.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({ secret: env.JWT_SECRET, signOptions: { algorithm: 'HS256' } }),
    }),
  ],
  providers: [AccessTokenService, JwtAuthGuard],
  exports: [AccessTokenService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
