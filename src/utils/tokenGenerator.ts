import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class TokenGeneratorService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(
    userId: string,
    email: string,
    secretKey: string,
    expiresIn?: JwtSignOptions['expiresIn'],
  ): string {
    const payload: { userId: string; email: string } = { userId, email };

    const options: JwtSignOptions = {};
    if (expiresIn !== undefined) {
      options.expiresIn = expiresIn;
    }

    return this.jwtService.sign(payload, { ...options, secret: secretKey });
  }
}
