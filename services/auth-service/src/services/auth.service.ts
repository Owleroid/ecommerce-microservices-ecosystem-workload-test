import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ConflictError, UnauthorizedError, ValidationError } from 'service-common';
import { UserRepository } from '../models/user.repository';
import { CreateUserDto, LoginDto, AuthTokens, UserResponse } from '../models/user.model';
import { config } from '../config/env';
import { redisClient } from '../config/redis';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_PREFIX = 'refresh_token:';

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async register(dto: CreateUserDto): Promise<UserResponse> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (dto.password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Create user
    const user = await this.userRepository.create(dto.email, passwordHash);

    return {
      id: user.id,
      email: user.email,
      createdAt: user.created_at.toISOString()
    };
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);

    // Store refresh token in Redis
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as { userId: number };

      // Check if refresh token exists in Redis
      const storedToken = await redisClient.get(
        `${REFRESH_TOKEN_PREFIX}${decoded.userId}`
      );

      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // Get user
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Generate new access token
      return this.generateAccessToken(user.id, user.email);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }

  async logout(userId: number): Promise<void> {
    // Remove refresh token from Redis
    await redisClient.del(`${REFRESH_TOKEN_PREFIX}${userId}`);
  }

  private generateAccessToken(userId: number, email: string): string {
    return jwt.sign(
      { userId, email, type: 'access' },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRY } as jwt.SignOptions
    );
  }

  private generateRefreshToken(userId: number): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      config.JWT_SECRET,
      { expiresIn: config.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
    );
  }

  private async storeRefreshToken(userId: number, token: string): Promise<void> {
    // Calculate TTL in seconds (7 days default)
    const ttl = 7 * 24 * 60 * 60;
    await redisClient.setEx(
      `${REFRESH_TOKEN_PREFIX}${userId}`,
      ttl,
      token
    );
  }
}
