import { User } from '@prisma/client';

export interface JwtPayload {
  sub: string; // Subject (User ID - UUIDv7)
  email: string; // Email
  role: string; // Role
  iat: number; // Issued At (timestamp)
  exp: number; // Expiration Time (timestamp)
}

export interface AuthResponse {
  accessToken: string; // JWT Access Token
  user: User; // Authenticated User
}
