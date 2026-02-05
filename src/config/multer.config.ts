import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const originalnameWithoutExt = file.originalname.replace(ext, '');
      callback(
        null,
        `${file.fieldname}-${uniqueSuffix}-${originalnameWithoutExt}${ext}`,
      );
    },
  }),
  fileFilter: (
    req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
};

export const multerOptionsForSingleFile = {
  ...multerConfig,
};

export const multerOptionsForMultipleFiles = {
  ...multerConfig,
};
