import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1786701080030 implements MigrationInterface {
    name = 'Migration1786701080030'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "coupon" ADD "visibleToCustomers" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "coupon" DROP COLUMN "visibleToCustomers"`);
    }

}
