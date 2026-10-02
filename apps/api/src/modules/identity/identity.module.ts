import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StaffAccountsService } from './accounts/staff-accounts.service';
import { AuthController } from './auth.controller';
import { PasswordHasher } from './credentials/password-hasher';
import { LoginChallengeService } from './login/login-challenge.service';
import { LoginService } from './login/login.service';
import { SessionService } from './sessions/session.service';
import { StaffAccountsController } from './staff-accounts.controller';
import { TotpService } from './totp/totp.service';

@Module({
  imports: [AuditModule],
  controllers: [AuthController, StaffAccountsController],
  providers: [PasswordHasher, TotpService, LoginChallengeService, LoginService, SessionService, StaffAccountsService],
  exports: [StaffAccountsService, PasswordHasher],
})
export class IdentityModule {}
