export const ROLES = ['ADMIN', 'DIGITIZER', 'GUARDIAN'] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES = ['ADMIN', 'DIGITIZER'] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const TOTP_CODE_PATTERN = /^\d{6}$/;

export interface CurrentAccount {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface LoginChallenge {
  challengeToken: string;
  challengeExpiresAt: string;
}

export type LoginStep =
  | { step: 'AUTHENTICATED'; account: CurrentAccount; tokens: AuthTokens }
  | ({ step: 'PASSWORD_CHANGE_REQUIRED' } & LoginChallenge)
  | ({ step: 'TOTP_ENROLLMENT_REQUIRED' } & LoginChallenge)
  | ({ step: 'TOTP_REQUIRED' } & LoginChallenge);

export interface TotpEnrollment {
  secret: string;
  qrSvg: string;
}

export interface StaffAccount {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  status: AccountStatus;
  totpEnabled: boolean;
  passwordChangeRequired: boolean;
  locked: boolean;
  lockedUntil: string | null;
  createdAt: string;
}

export interface StaffAccountCreated {
  account: StaffAccount;
  temporaryPassword: string;
}

export interface TemporaryPasswordIssued {
  temporaryPassword: string;
}
