import type { Role } from '@carnet/contracts';
import type { FastifyRequest } from 'fastify';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export type AuthenticatedRequest = FastifyRequest & { user?: AuthenticatedUser };
