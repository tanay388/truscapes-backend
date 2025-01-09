import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1729998812283 implements MigrationInterface {
    name = 'Migration1729998812283'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_gender_enum" AS ENUM('Male', 'Female', 'Prefer not to say')`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'admin')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updateAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying, "photo" character varying, "phone" character varying, "email" character varying, "birthDate" TIMESTAMP, "stripeId" character varying, "gender" "public"."user_gender_enum", "role" "public"."user_role_enum" NOT NULL DEFAULT 'user', CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_gender_enum"`);
    }

}
