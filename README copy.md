<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://7webs.co.in/assets/images/logos/logo_main.png" height="300" alt="Nest Logo" /></a>
</p>

## Description

#### NestJS template application with comprehensive setup for logging, caching, database connection using TypeORM, DDOS attack prevention, and Swagger OpenAPI integration. This setup is designed to reduce the time required to set up a production-grade server.

[Nest](https://github.com/nestjs/nest) framework TypeScript application.

## Installation

```bash
$ yarn
```

## Database setup

1. Create Postgres database using the following details:

```
  type: 'postgres'
  host: 'localhost'
  username: 'postgres'
  password: 'root'
  database: 'social-chat'
  port: 5432
  synchronize: true
  use_ssl: false
```

2. Add the following .env file to get started:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=root
DB_NAME=social-chat
SWAGGER_USER=swaggerUser
SWAGGER_PASSWORD=swaggerPassword
```

## Running the app

```bash
# watch mode
$ npm run start:dev

# Test production config locally with watch mode
$ npm run start:dev:prod

# production mode no watch mode, require build first
$ npm run build
$ npm run start:prod
```

## Database migration steps

1. ### Migration generate
2. ### Add Migration file into migrations
   1. Migration file will be generated in [migrations folder](src/providers/database/migrations)
   2. Remove old migrations if there are any
   3. Add the new generated migration file under [migration.config.ts](src/providers/database/migration.config.ts) in
      the configuration under the migrations array
3. ### Migration run

## Database migration scripts

```bash
# migration generate
yarn run migration:generate

# migration run
yarn run migration:run
```

## Deploy to Digital Ocean

- Deployment is straightforward, just push to master and it will be deployed automatically

## Using Swagger

Swagger is used for API documentation and provides an interactive interface to explore and test the endpoints.

#### Accessing Swagger UI

Swagger UI is available at the `/api` endpoint. To access the Swagger documentation:

Ensure your application is running.
Open your web browser and navigate to `http://localhost:3000/api` for local development environment.

#### Authentication

The Swagger UI is protected by Basic Authentication. You need to use the credentials configured in your environment variables to access it.

`Username`: The value of SWAGGER_USER from your environment configuration.

`Password`: The value of SWAGGER_PASSWORD from your environment configuration.

#### Example

If you have set the following environment variables:

```bash
SWAGGER_USER=swaggerUser
SWAGGER_PASSWORD=swaggerPassword
```

## Collaboration and Development Guide

For detailed information on our collaboration and development process, please refer to our [Collaboration and Development Guide](./Collaboration-Guide.md).

