import { Injectable, type OnModuleInit } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import { ARGON2_OPTIONS } from './argon2-options';

@Injectable()
export class PasswordHasher implements OnModuleInit {
  private decoyHash = '';

  async onModuleInit(): Promise<void> {
    this.decoyHash = await this.hash(randomBytes(24).toString('base64url'));
  }

  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }

  async spendDecoyVerification(password: string): Promise<void> {
    await verify(this.decoyHash, password);
  }
}
