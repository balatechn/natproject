import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // API versioning
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api');

  // Swagger
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NAT Project API')
      .setDescription('Enterprise Project Management Platform — API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .addTag('auth', 'Authentication')
      .addTag('users', 'User Management')
      .addTag('projects', 'Project Management')
      .addTag('tasks', 'Task Management')
      .addTag('resources', 'Resource Management')
      .addTag('workflows', 'Workflow Engine')
      .addTag('notifications', 'Notifications')
      .addTag('reports', 'Reports & Analytics')
      .addTag('admin', 'Admin Panel')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port, '0.0.0.0');
  console.info(`NAT Project API running on http://0.0.0.0:${port}`);
  console.info(`Swagger docs: http://0.0.0.0:${port}/api/docs`);
}

bootstrap();
