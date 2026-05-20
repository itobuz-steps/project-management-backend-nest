import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private client: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('S3_REGION')!;
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME')!;

    this.client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY')!,
        secretAccessKey: this.configService.get<string>(
          'S3_SECRET_ACCESS_KEY',
        )!,
      },
      forcePathStyle: true,
    });
  }

  async uploadSingleFile(file: Express.Multer.File) {
    try {
      const key = `${uuidv4()}`;
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
        },
      });

      const uploadResult = await this.client.send(command);

      return {
        url: await this.getPresignedSignedUrl(key),
        key,
        uploadResult,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async uploadMultipleFiles(files: Express.Multer.File[]) {
    try {
      if (!files?.length) {
        return [];
      }

      const uploadPromises = files.map(async (file) => {
        return this.uploadSingleFile(file);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  getFileUrl(key: string) {
    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }

  async getPresignedSignedUrl(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: 20,
      });

      return url;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new InternalServerErrorException(error);
    }
  }

  async deleteFile(key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);

      return { message: 'File deleted successfully' };
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new InternalServerErrorException(error);
    }
  }
}
