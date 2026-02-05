import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_FILE_TYPES,
  MAX_ATTACHMENT_FILE_SIZE,
} from 'src/constants/attachment.constants';

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
