import {MigrationInterface, QueryRunner} from 'typeorm';

export class AddDisplayName20240320000002 implements MigrationInterface {
  name = 'AddDisplayName20240320000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "display_name" character varying(255) NOT NULL DEFAULT 'Unknown'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "display_name"
    `);
  }
} 