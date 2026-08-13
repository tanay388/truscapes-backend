import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1786629427164 implements MigrationInterface {
    name = 'Migration1786629427164'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "coupon_eligible_categories_category" ("couponId" uuid NOT NULL, "categoryId" integer NOT NULL, CONSTRAINT "PK_205c5a60f7f5ff0a77bd0f49d60" PRIMARY KEY ("couponId", "categoryId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_64cf688441c7faa599414bafd3" ON "coupon_eligible_categories_category" ("couponId") `);
        await queryRunner.query(`CREATE INDEX "IDX_10606c028e9530a312a55711c8" ON "coupon_eligible_categories_category" ("categoryId") `);
        await queryRunner.query(`CREATE TABLE "coupon_eligible_products_products" ("couponId" uuid NOT NULL, "productsId" integer NOT NULL, CONSTRAINT "PK_83060b3b79ad01b705191c9bcfb" PRIMARY KEY ("couponId", "productsId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_88425fb500790d30c3062438bd" ON "coupon_eligible_products_products" ("couponId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f2956366645e5af9fc7cbb6e86" ON "coupon_eligible_products_products" ("productsId") `);
        await queryRunner.query(`CREATE TYPE "public"."coupon_scopetype_enum" AS ENUM('ENTIRE_ORDER', 'SPECIFIC_ITEMS')`);
        await queryRunner.query(`ALTER TABLE "coupon" ADD "scopeType" "public"."coupon_scopetype_enum" NOT NULL DEFAULT 'ENTIRE_ORDER'`);
        await queryRunner.query(`ALTER TABLE "coupon" ADD "includeSubcategories" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "coupon" ADD "bogoBuyQuantity" integer`);
        await queryRunner.query(`ALTER TABLE "coupon" ADD "bogoGetQuantity" integer`);
        await queryRunner.query(`ALTER TABLE "coupon" ADD "bogoGetDiscountPercent" numeric(10,2) DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "coupon" ADD "bogoMaxSetsPerOrder" integer`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD "discountAmount" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TYPE "public"."coupon_type_enum" RENAME TO "coupon_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."coupon_type_enum" AS ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'BOGO')`);
        await queryRunner.query(`ALTER TABLE "coupon" ALTER COLUMN "type" TYPE "public"."coupon_type_enum" USING "type"::"text"::"public"."coupon_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."coupon_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "coupon" ALTER COLUMN "value" SET DEFAULT '0'`);
        await queryRunner.query(`CREATE INDEX "IDX_orders_user" ON "orders" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_orders_status" ON "orders" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_orders_created_at" ON "orders" ("createdAt") `);
        await queryRunner.query(`ALTER TABLE "coupon_eligible_categories_category" ADD CONSTRAINT "FK_64cf688441c7faa599414bafd3f" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "coupon_eligible_categories_category" ADD CONSTRAINT "FK_10606c028e9530a312a55711c89" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "coupon_eligible_products_products" ADD CONSTRAINT "FK_88425fb500790d30c3062438bd6" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "coupon_eligible_products_products" ADD CONSTRAINT "FK_f2956366645e5af9fc7cbb6e867" FOREIGN KEY ("productsId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "coupon_eligible_products_products" DROP CONSTRAINT "FK_f2956366645e5af9fc7cbb6e867"`);
        await queryRunner.query(`ALTER TABLE "coupon_eligible_products_products" DROP CONSTRAINT "FK_88425fb500790d30c3062438bd6"`);
        await queryRunner.query(`ALTER TABLE "coupon_eligible_categories_category" DROP CONSTRAINT "FK_10606c028e9530a312a55711c89"`);
        await queryRunner.query(`ALTER TABLE "coupon_eligible_categories_category" DROP CONSTRAINT "FK_64cf688441c7faa599414bafd3f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_user"`);
        await queryRunner.query(`ALTER TABLE "coupon" ALTER COLUMN "value" DROP DEFAULT`);
        await queryRunner.query(`CREATE TYPE "public"."coupon_type_enum_old" AS ENUM('FIXED_AMOUNT', 'PERCENTAGE')`);
        await queryRunner.query(`ALTER TABLE "coupon" ALTER COLUMN "type" TYPE "public"."coupon_type_enum_old" USING "type"::"text"::"public"."coupon_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."coupon_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."coupon_type_enum_old" RENAME TO "coupon_type_enum"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "discountAmount"`);
        await queryRunner.query(`ALTER TABLE "coupon" DROP COLUMN "bogoMaxSetsPerOrder"`);
        await queryRunner.query(`ALTER TABLE "coupon" DROP COLUMN "bogoGetDiscountPercent"`);
        await queryRunner.query(`ALTER TABLE "coupon" DROP COLUMN "bogoGetQuantity"`);
        await queryRunner.query(`ALTER TABLE "coupon" DROP COLUMN "bogoBuyQuantity"`);
        await queryRunner.query(`ALTER TABLE "coupon" DROP COLUMN "includeSubcategories"`);
        await queryRunner.query(`ALTER TABLE "coupon" DROP COLUMN "scopeType"`);
        await queryRunner.query(`DROP TYPE "public"."coupon_scopetype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f2956366645e5af9fc7cbb6e86"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_88425fb500790d30c3062438bd"`);
        await queryRunner.query(`DROP TABLE "coupon_eligible_products_products"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_10606c028e9530a312a55711c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_64cf688441c7faa599414bafd3"`);
        await queryRunner.query(`DROP TABLE "coupon_eligible_categories_category"`);
    }

}
