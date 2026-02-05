import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Project Management Backend')
    .setDescription(
      'A comprehensive project management system API with authentication, task management, and project organization capabilities',
    )
    .setVersion('1.0')
    .addTag('tasks', 'Task management endpoints')
    .addBearerAuth()
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap().catch((err) => {
  console.error('Error during application bootstrap:', err);
});
