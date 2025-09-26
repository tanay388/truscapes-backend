import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import helmet from 'helmet';
import * as morgan from 'morgan';
import * as cookieParser from 'cookie-parser';
import * as expressBasicAuth from 'express-basic-auth';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpErrorFilter } from './common/utils/error-log';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
    cors: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // app.useGlobalFilters(new HttpErrorFilter());

  app.use(helmet());
  app.use(morgan('dev'));
  app.use(cookieParser());

  const swaggerPassword = process.env.SWAGGER_PASSWORD || 'swaggerPassword';
  const swaggerUser = process.env.SWAGGER_USER || 'swaggerUser';

  // Apply Basic Auth to the Swagger endpoint
  app.use(
    ['/api', '/api-json'],
    expressBasicAuth({
      challenge: true,
      users: {
        [swaggerUser]: swaggerPassword,
      },
    }),
  );
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: [VERSION_NEUTRAL],
  });
  const config = new DocumentBuilder()
    .setTitle('Social Chat Backend API')
    .setDescription('This is swagger backend to test APIs')
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Local server')
    .setExternalDoc('Postman Collection', '/api-json')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {});
  const PORT = process.env.PORT ?? 3000;
  await app.listen(PORT, () => {
    console.log(`listening on http://localhost:${PORT}`);
  });
}
bootstrap();
