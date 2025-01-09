<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://7webs.co.in/assets/images/logos/logo_main.png" height="300" alt="Nest Logo" /></a>
</p>

## Description

#### Comprehensive NestJS Template with Essential Configurations

This NestJS application template is built with critical setups like authorization, authentication, PostgreSQL database connection, Firebase admin configuration, file uploader, DDOS prevention, and more. Save development time and jump straight into feature development with this ready-to-use setup.

## Installation

```bash
$ yarn
```

## Package Overview

### Core Packages

- **@nestjs/axios**: Enables HTTP requests using Axios within NestJS services.
- **@nestjs/cache-manager**: Provides cache management support, helping improve application performance by caching data.
- **@nestjs/config**: Manages environment configurations, enabling secure handling of sensitive information.
- **@nestjs/jwt**: Implements JWT-based authentication, crucial for securing APIs.
- **@nestjs/passport**: Integrates Passport.js, allowing authentication strategies such as JWT.
- **@nestjs/platform-express**: Core adapter for Express, enabling routing and middleware usage in NestJS.
- **@nestjs/schedule**: Provides scheduling support, ideal for background tasks and periodic jobs.
- **@nestjs/swagger**: Adds Swagger API documentation, providing an interactive UI for exploring and testing endpoints.
- **@nestjs/throttler**: Implements rate limiting to prevent DDOS attacks.
- **@nestjs/typeorm**: Integrates TypeORM with NestJS, allowing for ORM-based data interaction.

### Utility Packages

- **axios**: Makes HTTP requests, typically used for external API calls.
- **cache-manager**: Provides caching mechanisms to improve performance by temporarily storing frequently accessed data.
- **class-transformer & class-validator**: Supports validation and transformation of DTOs, ensuring data consistency.
- **cookie-parser**: Parses cookies, enabling session-based authentication and tracking.
- **express-basic-auth**: Adds basic authentication, especially useful for protecting the Swagger UI.
- **firebase-admin**: Enables Firebase Admin SDK for managing Firebase services like authentication and Firestore.
- **helmet**: Provides security enhancements by setting HTTP headers, reducing vulnerabilities.
- **morgan**: HTTP request logger for development, helpful for debugging and monitoring requests.
- **passport & passport-jwt**: Authentication middleware and JWT strategy integration, essential for secure user authentication.
- **pg**: PostgreSQL client for Node.js, used to connect the app to a PostgreSQL database.
- **reflect-metadata**: Supports TypeScript decorators, essential for dependency injection and metadata reflection.
- **rxjs**: Reactive programming library, widely used in NestJS for managing asynchronous data streams.
- **typeorm**: Object-Relational Mapping (ORM) library, used to interact with relational databases.

### Development Packages

- **@nestjs/cli**: Command-line tool for generating NestJS modules, services, and controllers.
- **@nestjs/schematics & @nestjs/testing**: Schematics and testing support for NestJS, enhancing development productivity.
- **@types/\* packages**: TypeScript type definitions for various packages, improving development accuracy with type checking.
- **eslint & prettier**: Linting and code formatting tools, ensuring a consistent code style.
- **jest & supertest**: Testing libraries for unit and integration tests, helping maintain robust code quality.
- **typescript & ts-node**: TypeScript compiler and runtime support for Node.js, allowing TypeScript usage in the backend.

### Scripts Overview

- **Build**: `build` - Builds the application.
- **Format**: `format` - Applies Prettier formatting to ensure code consistency.
- **Start**: `start`, `start:dev`, `start:debug`, `start:prod` - Different modes for starting the server (e.g., development, production).
- **Lint**: `lint` - Runs ESLint to check and fix code issues.
- **Migration Scripts**: `migration:generate`, `migration:run`, `migration:create` - Manages TypeORM migrations for database schema changes.

## Updating npm Packages

To keep your dependencies up to date, follow these steps:

1. **Check for outdated packages**:

   ```bash
   yarn outdated
   ```

   This command will list packages that have updates available.

2. **Upgrade specific packages**:

   ```bash
   yarn upgrade <package-name>@<version>
   ```

   Replace `<package-name>` and `<version>` with the package and version you wish to update.

3. **Update all packages**:

   ```bash
   yarn upgrade --latest
   ```

   This updates all packages to their latest compatible versions.

4. **Run tests** to ensure updates haven't introduced issues:
   ```bash
   yarn test
   ```

> **Tip**: For major updates, review the package documentation for potential breaking changes.

## Database Setup

1. **Create a PostgreSQL database** with the following details:

   ```yaml
   type: 'postgres'
   host: 'localhost'
   username: 'postgres'
   password: 'root'
   database: 'social-chat'
   port: 5432
   synchronize: true
   use_ssl: false
   ```

2. **Add the following environment variables** in your `.env` file to get started:

   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=root
   DB_NAME=social-chat
   SWAGGER_USER=swaggerUser
   SWAGGER_PASSWORD=super@20024

   GOOGLE_PROJECT_ID=firebase-proj-id
   GOOGLE_CLIENT_EMAIL=firebase-admin-sdk-client-email@email
   GOOGLE_PRIVATE_KEY_ID=private-key-id
   FIREBASE_STORAGE_BUCKET=firebase-proj-id.appspot.com
   GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nprivatekey-for-firebase-admin-it-is-used-to-authenticate-admin\n-----END PRIVATE KEY-----\n
   ```

## Running the App

```bash
# Start in watch mode
$ npm run start:dev

# Test production config locally in watch mode
$ npm run start:dev:prod

# Start in production mode (requires build)
$ npm run build
$ npm run start:prod
```

## Database Migration Steps

1. **Generate a Migration**
2. **Add Migration File to the Migrations Folder**
   - The migration file will be generated in the [migrations folder](src/providers/database/migrations).
   - Remove any old migrations if needed.
   - Add the new migration file under [migration.config.ts](src/providers/database/migration.config.ts) within the migrations array.
3. **Run the Migration**

## Database Migration Scripts

```bash
# Generate migration
yarn run migration:generate

# Run migration
yarn run migration:run
```

## Using Swagger

Swagger is integrated to document and interact with the API endpoints.

### Accessing Swagger UI

Swagger UI is available at `/api`:

1. Ensure the app is running.
2. Open `http://localhost:3000/api` in your browser (for local environments).

### Authentication for Swagger UI

To access Swagger, use Basic Authentication with the credentials specified in your environment variables.

- **Username**: Value of `SWAGGER_USER` in your `.env` file
- **Password**: Value of `SWAGGER_PASSWORD` in your `.env` file

#### Example Credentials

```bash
SWAGGER_USER=swaggerUser
SWAGGER_PASSWORD=swaggerPassword
```

## Collaboration and Development Guide

For details on the collaboration process and development guidelines, please refer to our [Collaboration and Development Guide](./Collaboration-Guide.md).
