import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1786900000000 implements MigrationInterface {
  name = 'Migration1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Existing products keep the previous flat 5% case discount.
    await queryRunner.query(
      `ALTER TABLE "products" ADD "caseDiscountPercent" numeric(5,2) NOT NULL DEFAULT '5'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "caseDiscountPercent"`,
    );
  }
}
