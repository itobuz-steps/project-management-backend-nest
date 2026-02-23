import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_FILE_TYPES,
  MAX_ATTACHMENT_FILE_SIZE,
} from 'src/constants/attachment.constants';

export const multerConfig = {
  storage: memoryStorage(),
  fileFilter: (
    req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          `File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: MAX_ATTACHMENT_FILE_SIZE, // 10MB max file size
  },
};

export const multerOptionsForSingleFile = {
  ...multerConfig,
};

export const multerOptionsForMultipleFiles = {
  ...multerConfig,
};
