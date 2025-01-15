import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * The DatabaseModule is a wrapper around the TypeORM forRootAsync()
 * configuration method. It creates a TypeORM configuration object
 * using environment variables.
 *
 * @module DatabaseModule
 */
@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      /**
       * Creates a TypeORM configuration object using environment variables.
       * @returns {Promise<TypeOrmModuleOptions>} A TypeORM configuration object.
       */
      useFactory: async () => ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: ['error', 'warn', 'info'],
        ssl: { rejectUnauthorized: false },
      }),
    }),
  ],
})
export class DatabaseModule {}
