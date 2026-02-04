import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  Type,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Model, Document } from 'mongoose';

export function CheckExists<T extends Document>(
  model: Model<T>,
): Type<CanActivate> {
  class CheckExistsGuardMixin implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest<Request>();
      const id = req.params?.id;

      if (!id) {
        throw new BadRequestException('ID must not be empty');
      }

      const result = await model.findOne({ _id: id });

      if (!result) {
        throw new NotFoundException('ID not found: ' + req.originalUrl);
      }

      return true;
    }
  }

  return CheckExistsGuardMixin;
}
