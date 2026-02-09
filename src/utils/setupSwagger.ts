import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Project Management Backend')
    .setDescription(
      'A comprehensive project management system API with authentication, task management, and project organization capabilities',
    )
    .setVersion('1.0')
    .addTag('tasks', 'Task management endpoints')
    .addTag('comments', 'Comment management endpoints')
    .addBearerAuth()
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory);
}
