import {MigrationInterface, QueryRunner} from 'typeorm';

export class AddAuditColumns20240320000001 implements MigrationInterface {
  name = 'AddAuditColumns20240320000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add revoked_by column to certificates table
    await queryRunner.query(`
      ALTER TABLE "certificates"
      ADD COLUMN IF NOT EXISTS "revoked_by" character varying(255)
    `);

    // Add created_by column to requests table
    await queryRunner.query(`
      ALTER TABLE "requests"
      ADD COLUMN IF NOT EXISTS "created_by" character varying(255)
    `);

    // Add created_by column to certificates table
    await queryRunner.query(`
      ALTER TABLE "certificates"
      ADD COLUMN IF NOT EXISTS "created_by" character varying(255)
    `);

    // Add updated_by column to certificates table
    await queryRunner.query(`
      ALTER TABLE "certificates"
      ADD COLUMN IF NOT EXISTS "updated_by" character varying(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove revoked_by column from certificates table
    await queryRunner.query(`
      ALTER TABLE "certificates"
      DROP COLUMN IF EXISTS "revoked_by"
    `);

    // Remove created_by column from requests table
    await queryRunner.query(`
      ALTER TABLE "requests"
      DROP COLUMN IF EXISTS "created_by"
    `);

    // Remove created_by column from certificates table
    await queryRunner.query(`
      ALTER TABLE "certificates"
      DROP COLUMN IF EXISTS "created_by"
    `);

    // Remove updated_by column from certificates table
    await queryRunner.query(`
      ALTER TABLE "certificates"
      DROP COLUMN IF EXISTS "updated_by"
    `);
  }
} 