import { DataSource } from 'typeorm';
import { Migration1729998812283 } from './migrations/1729998812283-migration';

/**
 * TypeORM DataSource configuration for migrations.
 *
 * @remarks
 * This is the configuration for TypeORM's DataSource that is used for running migrations.
 * The DataSource is configured to connect to the PostgreSQL, or any other database specified by the
 * environment variables DB_HOST, DB_PASSWORD, DB_USERNAME, DB_NAME, and DB_PORT.
 * The migrations are stored in the migrations directory, and the entities are stored in the
 * entities directory.
 *
 * @see {@link https://typeorm.io/docs/data-source}
 */
export const datasource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  username: process.env.DB_USERNAME,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  // synchronize: false,
  // ssl: {
  //   rejectUnauthorized: false,
  // },

  migrations: [],
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  logging: ['error', 'warn', 'info'],
});
