import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1786800000000 implements MigrationInterface {
  name = 'Migration1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "isPairProduct" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`
      UPDATE "products"
      SET "isPairProduct" = true
      WHERE name ILIKE '%(TS-B301)%'
         OR name ILIKE '%(TS-B302)%'
         OR name ILIKE '%(TS-B306)%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "isPairProduct"`,
    );
  }
}
