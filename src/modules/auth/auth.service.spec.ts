/// <reference types="jest" />

jest.mock('./schemas/user.schema', () => ({
  User: class User {},
  UserSchema: {},
}));
jest.mock('./schemas/otp.schema', () => ({
  Otp: class Otp {},
  OtpSchema: {},
}));
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from './schemas/user.schema';
import { Otp } from './schemas/otp.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { UserDocument } from './schemas/user.schema';
import type { OtpDocument } from './schemas/otp.schema';

type CreateUserPayload = { name: string; email: string; password: string };
type UserEmailFilter = { email: string };
type PasswordUpdate = { password: string };
type UpdateOptions = { new: boolean; runValidators: boolean };
type OtpCreatePayload = { userId: Types.ObjectId; value: number; expiry: Date };

type OtpQueryMock = {
  sort: jest.Mock<Promise<OtpDocument | null>, [Record<string, 1 | -1>]>;
};

type UserModelMock = {
  create: jest.Mock<Promise<UserDocument>, [CreateUserPayload]>;
  findById: jest.Mock<Promise<UserDocument | null>, [Types.ObjectId | string]>;
  findOne: jest.Mock<Promise<UserDocument | null>, [UserEmailFilter]>;
  findOneAndUpdate: jest.Mock<
    Promise<UserDocument | null>,
    [UserEmailFilter, PasswordUpdate]
  >;
  findByIdAndUpdate: jest.Mock<
    Promise<UserDocument | null>,
    [Types.ObjectId | string, { $set: Record<string, unknown> }, UpdateOptions]
  >;
};

type OtpModelMock = {
  create: jest.Mock<Promise<OtpDocument>, [OtpCreatePayload]>;
  findOne: jest.Mock<OtpQueryMock, [{ userId: Types.ObjectId }]>;
};

type ConfigServiceMock = {
  get: jest.Mock<string | number | undefined, [string]>;
};

const buildOtpQuery = (result: OtpDocument | null): OtpQueryMock => ({
  sort: jest
    .fn<Promise<OtpDocument | null>, [Record<string, 1 | -1>]>()
    .mockResolvedValue(result),
});

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: UserModelMock;
  let mockOtpModel: OtpModelMock;
  let mockConfigService: ConfigServiceMock;

  const mockUserId = new Types.ObjectId();
  const saveMock = jest.fn<Promise<UserDocument>, []>();
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

  const mockOtp = {
    _id: new Types.ObjectId(),
    userId: mockUserId,
    value: 123456,
    expiry: new Date(Date.now() + 5 * 60 * 1000),
    createdAt: new Date(),
  } as unknown as OtpDocument;

  beforeEach(async () => {
    mockUserModel = {
      create: jest.fn<Promise<UserDocument>, [CreateUserPayload]>(),
      findById: jest.fn<
        Promise<UserDocument | null>,
        [Types.ObjectId | string]
      >(),
      findOne: jest.fn<Promise<UserDocument | null>, [UserEmailFilter]>(),
      findOneAndUpdate: jest.fn<
        Promise<UserDocument | null>,
        [UserEmailFilter, PasswordUpdate]
      >(),
      findByIdAndUpdate: jest.fn<
        Promise<UserDocument | null>,
        [
          Types.ObjectId | string,
          { $set: Record<string, unknown> },
          UpdateOptions,
        ]
      >(),
    };

    mockOtpModel = {
      create: jest.fn<Promise<OtpDocument>, [OtpCreatePayload]>(),
      findOne: jest.fn<OtpQueryMock, [{ userId: Types.ObjectId }]>(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OTP_EXPIRATION') return 5;
        return 'test-value';
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Otp.name),
          useValue: mockOtpModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedPassword123',
      };

      mockUserModel.create.mockResolvedValue(mockUser);

      const result = await service.createUser(
        createUserDto.name,
        createUserDto.email,
        createUserDto.password,
      );

      expect(result).toEqual(mockUser);
      expect(mockUserModel.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should handle create errors', async () => {
      mockUserModel.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createUser('John', 'john@example.com', 'password'),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getUserById', () => {
    it('should return a user by id', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById(mockUserId);

      expect(result).toEqual(mockUser);
      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.getUserById(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserById(mockUserId)).rejects.toThrow(
        'User not found',
      );
    });

    it('should accept string userId and convert to ObjectId', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.getUserById(mockUserId.toString());

      expect(mockUserModel.findById).toHaveBeenCalledWith(
        mockUserId.toString(),
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should return a user by email', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail('john@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'john@example.com',
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.getUserByEmail('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isVerified', () => {
    it('should return true if user is verified', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.isVerified(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false if user is not verified', async () => {
      const unverifiedUser = {
        ...mockUser,
        verified: false,
      } as UserDocument;
      mockUserModel.findById.mockResolvedValue(unverifiedUser);

      const result = await service.isVerified(mockUserId);

      expect(result).toBe(false);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.isVerified(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      mockUserModel.findOneAndUpdate.mockResolvedValue(mockUser);

      await service.updatePassword('john@example.com', 'newHashedPassword');

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { email: 'john@example.com' },
        { password: 'newHashedPassword' },
      );
    });

    it('should handle update errors', async () => {
      mockUserModel.findOneAndUpdate.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        service.updatePassword('john@example.com', 'newPassword'),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockOtpModel.findOne.mockReturnValue(buildOtpQuery(mockOtp));

      await service.verifyOtp('john@example.com', '123456');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'john@example.com',
      });
      expect(mockOtpModel.findOne).toHaveBeenCalledWith({
        userId: mockUser._id,
      });
    });

    it('should throw BadRequestException if OTP is invalid', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockOtpModel.findOne.mockReturnValue(buildOtpQuery(mockOtp));

      await expect(
        service.verifyOtp('john@example.com', 'wrongOtp'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      const expiredOtp = {
        ...mockOtp,
        expiry: new Date(Date.now() - 1000),
      } as OtpDocument;
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockOtpModel.findOne.mockReturnValue(buildOtpQuery(expiredOtp));

      await expect(
        service.verifyOtp('john@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no OTP found', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockOtpModel.findOne.mockReturnValue(buildOtpQuery(null));

      await expect(
        service.verifyOtp('john@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyUser', () => {
    it('should verify user successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockOtpModel.findOne.mockReturnValue(buildOtpQuery(mockOtp));

      await service.verifyUser('john@example.com', '123456');

      expect(mockUser.verified).toBe(true);
      expect(saveMock).toHaveBeenCalled();
    });

    it('should throw error if OTP verification fails', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockOtpModel.findOne.mockReturnValue(buildOtpQuery(null));

      await expect(
        service.verifyUser('john@example.com', 'wrongOtp'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockOtpModel.findOne.mockReturnValue(buildOtpQuery(mockOtp));
      mockUserModel.findOneAndUpdate.mockResolvedValue(mockUser);

      await service.resetPassword(
        'john@example.com',
        '123456',
        'newHashedPassword',
      );

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { email: 'john@example.com' },
        { password: 'newHashedPassword' },
      );
    });

    it('should throw error if OTP verification fails', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockOtpModel.findOne.mockReturnValue(buildOtpQuery(null));

      await expect(
        service.resetPassword('john@example.com', 'wrongOtp', 'newPassword'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateOtp', () => {
    it('should generate OTP successfully', async () => {
      mockOtpModel.create.mockResolvedValue(mockOtp);

      const result = await service.generateOtp(mockUserId);

      expect(result).toBe(mockOtp.value.toString());
      expect(mockOtpModel.create).toHaveBeenCalled();
      const createArgs = mockOtpModel.create.mock.calls[0][0];
      expect(createArgs.userId).toBe(mockUserId);
      expect(typeof createArgs.value).toBe('number');
    });

    it('should set correct expiry time', async () => {
      mockOtpModel.create.mockResolvedValue(mockOtp);
      const before = Date.now();

      await service.generateOtp(mockUserId);

      const after = Date.now();
      const createCall = mockOtpModel.create.mock.calls[0][0];
      const expiry = createCall.expiry;
      if (!expiry) {
        throw new Error('Expected expiry to be defined');
      }
      const expiryTime = expiry.getTime();

      expect(expiryTime).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
      expect(expiryTime).toBeLessThanOrEqual(after + 5 * 60 * 1000 + 1000);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = { name: 'Jane Doe' };
      const updatedUser = { ...mockUser, ...updateData } as UserDocument;
      mockUserModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(mockUserId, updateData);

      expect(result.name).toBe('Jane Doe');
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { $set: updateData },
        { new: true, runValidators: true },
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateProfile(mockUserId, { name: 'Jane' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow updating multiple fields', async () => {
      const updateData = {
        name: 'Jane Doe',
        profileImage: 'image.jpg',
      };
      const updatedUser = { ...mockUser, ...updateData } as UserDocument;
      mockUserModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(mockUserId, updateData);

      expect(result.name).toBe('Jane Doe');
      expect(result.profileImage).toBe('image.jpg');
    });
  });
});
