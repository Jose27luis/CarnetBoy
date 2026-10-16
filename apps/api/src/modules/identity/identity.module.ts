import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminBootstrapService } from './accounts/admin-bootstrap.service';
import { GuardianAccountsService } from './accounts/guardian-accounts.service';
import { StaffAccountsService } from './accounts/staff-accounts.service';
import { AuthController } from './auth.controller';
import { PasswordHasher } from './credentials/password-hasher';
import { LoginChallengeService } from './login/login-challenge.service';
import { LoginService } from './login/login.service';
import { OwnAccountController } from './own-account.controller';
import { SessionService } from './sessions/session.service';
import { StaffAccountsController } from './staff-accounts.controller';
import { TotpService } from './totp/totp.service';

@Module({
  imports: [AuditModule, SettingsModule],
  controllers: [AuthController, StaffAccountsController, OwnAccountController],
  providers: [
    PasswordHasher,
    TotpService,
    LoginChallengeService,
    LoginService,
    SessionService,
    StaffAccountsService,
    GuardianAccountsService,
    AdminBootstrapService,
  ],
  exports: [StaffAccountsService, GuardianAccountsService, LoginChallengeService, PasswordHasher],
})
export class IdentityModule {}
