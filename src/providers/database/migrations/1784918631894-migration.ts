import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1784918631894 implements MigrationInterface {
    name = 'Migration1784918631894'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "saved_order_items" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updateAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "productId" integer NOT NULL, "variantId" integer NOT NULL, "quantity" integer NOT NULL, "quantityType" character varying(20) NOT NULL DEFAULT 'SINGLE', "name" character varying(255) NOT NULL, "variantName" character varying(255) NOT NULL, "image" text, "price" numeric(10,3) NOT NULL, "caseSize" integer NOT NULL DEFAULT '12', "isPairProduct" boolean NOT NULL DEFAULT false, "savedOrderId" integer, CONSTRAINT "PK_a2a3e5f46a20e40a3004c6f02e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "saved_orders" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updateAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying(255) NOT NULL, "notes" text, "paymentOrder" text, "userId" character varying, CONSTRAINT "PK_f9322d354a02b3ba909487c82c1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "product_variants" ADD "sortOrder" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "saved_order_items" ADD CONSTRAINT "FK_856be93ac7e2b392b5eb20a21fa" FOREIGN KEY ("savedOrderId") REFERENCES "saved_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "saved_orders" ADD CONSTRAINT "FK_3467bff7d82366e0e483b0ef53d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "saved_orders" DROP CONSTRAINT "FK_3467bff7d82366e0e483b0ef53d"`);
        await queryRunner.query(`ALTER TABLE "saved_order_items" DROP CONSTRAINT "FK_856be93ac7e2b392b5eb20a21fa"`);
        await queryRunner.query(`ALTER TABLE "product_variants" DROP COLUMN "sortOrder"`);
        await queryRunner.query(`DROP TABLE "saved_orders"`);
        await queryRunner.query(`DROP TABLE "saved_order_items"`);
    }

}
