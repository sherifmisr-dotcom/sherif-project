import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Security headers
    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));

    // Serve static files from uploads directory
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
        prefix: '/uploads',
    });

    // Enable CORS
    const isProduction = process.env.NODE_ENV === 'production';
    const corsOrigins = isProduction
        ? [process.env.CORS_ORIGIN].filter(Boolean)
        : [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            process.env.CORS_ORIGIN,
        ].filter(Boolean);
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Swagger documentation (only in development)
    if (process.env.NODE_ENV !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('Customs Operations API')
            .setDescription('Backend API for Customs Operations Management System')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api', app, document);
    }

    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    if (!isProduction) {
        logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
    }
}
bootstrap();
