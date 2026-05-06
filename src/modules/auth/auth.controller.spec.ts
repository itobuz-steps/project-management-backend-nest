/// <reference types="jest" />
jest.mock('./schemas/user.schema', () => ({
  User: class User {},
  UserSchema: {},
}));
jest.mock('./schemas/otp.schema', () => ({
  Otp: class Otp {},
  OtpSchema: {},
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
import { Test } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from '../../mail/mail.service';
import { TokenGeneratorService } from 'src/utils/tokenGenerator';
import { StorageService } from 'src/storage/storage.service';
import { IsAuthenticated } from '../../middlewares/isAuthenticated';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import type { AppConfig } from 'src/config/app.config';
import type { UserDocument } from './schemas/user.schema';

const hashMock = bcrypt.hash as unknown as jest.Mock<
  Promise<string>,
  [string | Buffer, string | number]
>;
const compareMock = bcrypt.compare as unknown as jest.Mock<
  Promise<boolean>,
  [string | Buffer, string]
>;

describe('AuthController', () => {
  type MockedFn<T extends (...args: never[]) => unknown> = jest.Mock<
    ReturnType<T>,
    Parameters<T>
  >;

  type AuthServiceMock = {
    createUser: MockedFn<AuthService['createUser']>;
    getUserByEmail: MockedFn<AuthService['getUserByEmail']>;
    getUserById: MockedFn<AuthService['getUserById']>;
    updatePassword: MockedFn<AuthService['updatePassword']>;
    generateOtp: MockedFn<AuthService['generateOtp']>;
    verifyUser: MockedFn<AuthService['verifyUser']>;
    verifyOtp: MockedFn<AuthService['verifyOtp']>;
    resetPassword: MockedFn<AuthService['resetPassword']>;
    updateProfile: MockedFn<AuthService['updateProfile']>;
  };

  type MailServiceMock = {
    sendVerificationMail: MockedFn<MailService['sendVerificationMail']>;
  };

  type TokenGeneratorServiceMock = {
    generateToken: MockedFn<TokenGeneratorService['generateToken']>;
  };

  type ConfigServiceMock = {
    get: jest.Mock<string | AppConfig[keyof AppConfig] | undefined, [string]>;
  };

  type StorageServiceMock = {
    deleteFile: MockedFn<StorageService['deleteFile']>;
    uploadSingleFile: MockedFn<StorageService['uploadSingleFile']>;
  };

  type AuthenticatedRequest = Request & { user?: UserDocument };

  const createMock = <T extends (...args: never[]) => unknown>() =>
    jest.fn<ReturnType<T>, Parameters<T>>();

  let controller: AuthController;
  let authService: AuthServiceMock;
  let mailService: MailServiceMock;
  let tokenGeneratorService: TokenGeneratorServiceMock;
  let configService: ConfigServiceMock;
  let storageService: StorageServiceMock;

  const mockUserId = new Types.ObjectId();
  const saveMock = jest.fn();
  const mockUser = {
    _id: mockUserId,
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword123',
    verified: true,
    profileImage: null,
    profileImageKey: null,
    projects: [],
    subscription: null,
    notificationPreferences: {
      email: true,
      push: true,
      inApp: true,
    },
    role: 'user',
    onlineStatus: 'offline',
    save: saveMock,
  } as unknown as UserDocument;

  beforeEach(async () => {
    authService = {
      createUser: createMock<AuthService['createUser']>(),
      getUserByEmail: createMock<AuthService['getUserByEmail']>(),
      getUserById: createMock<AuthService['getUserById']>(),
      updatePassword: createMock<AuthService['updatePassword']>(),
      generateOtp: createMock<AuthService['generateOtp']>(),
      verifyUser: createMock<AuthService['verifyUser']>(),
      verifyOtp: createMock<AuthService['verifyOtp']>(),
      resetPassword: createMock<AuthService['resetPassword']>(),
      updateProfile: createMock<AuthService['updateProfile']>(),
    };

    mailService = {
      sendVerificationMail: createMock<MailService['sendVerificationMail']>(),
    };

    tokenGeneratorService = {
      generateToken: createMock<TokenGeneratorService['generateToken']>(),
    };
    tokenGeneratorService.generateToken.mockReturnValue('mocked-token');

    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_KEY: 'access-key',
          JWT_REFRESH_KEY: 'refresh-key',
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
        };
        return config[key];
      }),
    };

    storageService = {
      deleteFile: createMock<StorageService['deleteFile']>(),
      uploadSingleFile: createMock<StorageService['uploadSingleFile']>(),
    };

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: MailService, useValue: mailService },
        { provide: TokenGeneratorService, useValue: tokenGeneratorService },
        { provide: ConfigService, useValue: configService },
        { provide: StorageService, useValue: storageService },
      ],
    })
      .overrideGuard(IsAuthenticated)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should successfully sign up a new user', async () => {
      const signupDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!@#',
      };

      authService.getUserByEmail.mockRejectedValue(new Error('User not found'));
      authService.createUser.mockResolvedValue(mockUser);
      authService.generateOtp.mockResolvedValue('123456');
      hashMock.mockResolvedValue('hashedPassword');

      const result = await controller.signup(signupDto);

      expect(result).toEqual({
        success: true,
        message: 'User successfully registered',
      });
      expect(authService.createUser).toHaveBeenCalledWith(
        signupDto.name,
        signupDto.email,
        'hashedPassword',
      );
      expect(authService.generateOtp).toHaveBeenCalled();
      expect(mailService.sendVerificationMail).toHaveBeenCalledWith(
        signupDto.email,
        '123456',
      );
    });

    it('should throw ConflictException if user already exists and is verified', async () => {
      const signupDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!@#',
      };

      authService.getUserByEmail.mockResolvedValue(mockUser);
      hashMock.mockResolvedValue('hashedPassword');

      await expect(controller.signup(signupDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update password if user exists but is not verified', async () => {
      const signupDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!@#',
      };

      const unverifiedUser = {
        ...mockUser,
        verified: false,
      } as UserDocument;
      authService.getUserByEmail.mockResolvedValue(unverifiedUser);
      authService.updatePassword.mockResolvedValue(undefined);
      authService.generateOtp.mockResolvedValue('123456');
      hashMock.mockResolvedValue('hashedPassword');

      const result = await controller.signup(signupDto);

      expect(result).toEqual({
        success: true,
        message: 'User successfully registered',
      });
      expect(authService.updatePassword).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const signupDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!@#',
      };

      authService.getUserByEmail.mockRejectedValue(new Error('Database error'));
      authService.createUser.mockRejectedValue(new Error('Database error'));
      hashMock.mockResolvedValue('hashedPassword');

      await expect(controller.signup(signupDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verify', () => {
    it('should successfully verify user', async () => {
      const verifyOtpDto = {
        email: 'john@example.com',
        otp: '123456',
      };

      authService.verifyUser.mockResolvedValue(undefined);

      const result = await controller.verify(verifyOtpDto);

      expect(result).toEqual({
        success: true,
        message: 'User verified successfully',
      });
      expect(authService.verifyUser).toHaveBeenCalledWith(
        verifyOtpDto.email,
        verifyOtpDto.otp,
      );
    });

    it('should throw error if OTP is invalid', async () => {
      const verifyOtpDto = {
        email: 'john@example.com',
        otp: 'wrongOtp',
      };

      authService.verifyUser.mockRejectedValue(new Error('Invalid OTP'));

      await expect(controller.verify(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should successfully login user', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'Password123!@#',
      };

      authService.getUserByEmail.mockResolvedValue(mockUser);
      compareMock.mockResolvedValue(true);

      const result = await controller.login(loginDto);

      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        accessToken: 'mocked-token',
        refreshToken: 'mocked-token',
      });
      expect(tokenGeneratorService.generateToken).toHaveBeenCalledTimes(3);
    });

    it('should throw error if password is invalid', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'WrongPassword!@#',
      };

      authService.getUserByEmail.mockResolvedValue(mockUser);
      compareMock.mockResolvedValue(false);

      await expect(controller.login(loginDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user is not verified', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'Password123!@#',
      };

      const unverifiedUser = {
        ...mockUser,
        verified: false,
      } as UserDocument;
      authService.getUserByEmail.mockResolvedValue(unverifiedUser);
      compareMock.mockResolvedValue(true);

      await expect(controller.login(loginDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user not found', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Password123!@#',
      };

      authService.getUserByEmail.mockRejectedValue(new Error('User not found'));

      await expect(controller.login(loginDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('sendOtp', () => {
    it('should successfully send OTP', async () => {
      const sendOtpDto = {
        email: 'john@example.com',
      };

      authService.getUserByEmail.mockResolvedValue(mockUser);
      authService.generateOtp.mockResolvedValue('123456');

      const result = await controller.sendOtp(sendOtpDto);

      expect(result).toEqual({
        success: true,
        message: 'OTP sent successfully',
      });
      expect(authService.generateOtp).toHaveBeenCalled();
      expect(mailService.sendVerificationMail).toHaveBeenCalledWith(
        sendOtpDto.email,
        '123456',
      );
    });

    it('should throw error if email is not provided', async () => {
      const sendOtpDto = {
        email: '',
      };

      await expect(controller.sendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user not found', async () => {
      const sendOtpDto = {
        email: 'nonexistent@example.com',
      };

      authService.getUserByEmail.mockRejectedValue(new Error('User not found'));

      await expect(controller.sendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user is not verified', async () => {
      const sendOtpDto = {
        email: 'john@example.com',
      };

      const unverifiedUser = {
        ...mockUser,
        verified: false,
      } as UserDocument;
      authService.getUserByEmail.mockResolvedValue(unverifiedUser);

      await expect(controller.sendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      const resetPasswordDto = {
        email: 'john@example.com',
        otp: '123456',
        password: 'NewPassword123!@#',
      };

      authService.resetPassword.mockResolvedValue(undefined);
      hashMock.mockResolvedValue('hashedPassword');

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual({
        success: true,
        message: 'Password reset successful',
      });
      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.email,
        resetPasswordDto.otp,
        'hashedPassword',
      );
    });

    it('should throw error if required fields are missing', async () => {
      const resetPasswordDto = {
        email: 'john@example.com',
        otp: '',
        password: 'NewPassword123!@#',
      };

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if OTP is invalid', async () => {
      const resetPasswordDto = {
        email: 'john@example.com',
        otp: 'wrongOtp',
        password: 'NewPassword123!@#',
      };

      authService.resetPassword.mockRejectedValue(new Error('Invalid OTP'));
      hashMock.mockResolvedValue('hashedPassword');

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', () => {
      const mockRequest = {
        user: mockUser,
      } as AuthenticatedRequest;

      const result = controller.refreshToken(mockRequest);

      expect(result).toEqual({
        success: true,
        message: 'Tokens refreshed',
        accessToken: 'mocked-token',
        refreshToken: 'mocked-token',
      });
      expect(tokenGeneratorService.generateToken).toHaveBeenCalledTimes(2);
    });

    it('should throw error if user is not authenticated', () => {
      const mockRequest = {
        user: undefined,
      } as AuthenticatedRequest;

      expect(() => controller.refreshToken(mockRequest)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProfile', () => {
    it('should successfully get user profile', () => {
      const mockRequest = {
        user: mockUser,
      } as AuthenticatedRequest;

      const result = controller.getProfile(mockRequest);

      expect(result).toEqual({
        success: true,
        result: {
          _id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
          profileImage: mockUser.profileImage,
          notificationPreferences: mockUser.notificationPreferences,
          role: mockUser.role,
        },
      });
    });

    it('should throw error if user is not authenticated', () => {
      const mockRequest = {
        user: undefined,
      } as AuthenticatedRequest;

      expect(() => controller.getProfile(mockRequest)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
