import {MigrationInterface, QueryRunner} from 'typeorm';

export class CreateTables20240320000000 implements MigrationInterface {
  name = 'CreateTables20240320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Drop existing tables if they exist
    await queryRunner.query(`DROP TABLE IF EXISTS "certificates" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_groups" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "groups" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "requests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "status" character varying(20) NOT NULL CHECK (status IN ('active', 'inactive')),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_by" character varying(255),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_by" character varying(255),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create requests table
    await queryRunner.query(`
      CREATE TABLE "requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying(255) NOT NULL,
        "display_name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "status" character varying(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
        "challenge" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_by" character varying(255),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_by" character varying(255),
        CONSTRAINT "PK_requests" PRIMARY KEY ("id")
      )
    `);

    // Create groups table
    await queryRunner.query(`
      CREATE TABLE "groups" (
        "name" character varying(255) NOT NULL,
        "display_name" character varying(255) NOT NULL,
        "description" text,
        "status" character varying(20) NOT NULL CHECK (status IN ('active', 'inactive')),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_by" character varying(255),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_by" character varying(255),
        CONSTRAINT "PK_groups" PRIMARY KEY ("name")
      )
    `);

    // Create user_groups table
    await queryRunner.query(`
      CREATE TABLE "user_groups" (
        "user_id" uuid NOT NULL,
        "group_name" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_by" character varying(255),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_by" character varying(255),
        CONSTRAINT "PK_user_groups" PRIMARY KEY ("user_id", "group_name"),
        CONSTRAINT "FK_user_groups_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_user_groups_group_name" FOREIGN KEY ("group_name") REFERENCES "groups"("name") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create certificates table
    await queryRunner.query(`
      CREATE TABLE "certificates" (
        "serial_number" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code_version" character varying(50) NOT NULL,
        "username" character varying(255) NOT NULL,
        "common_name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "fingerprint" text NOT NULL,
        "not_before" TIMESTAMP WITH TIME ZONE NOT NULL,
        "not_after" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" character varying(20) NOT NULL CHECK (status IN ('active', 'revoked')),
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "revoked_by" character varying(255),
        "revocation_reason" text,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_by" character varying(255),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_by" character varying(255),
        CONSTRAINT "UQ_certificates_fingerprint" UNIQUE ("fingerprint"),
        CONSTRAINT "PK_certificates" PRIMARY KEY ("serial_number"),
        CONSTRAINT "FK_certificates_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "idx_users_username" ON "users" ("username")`);
    await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "idx_users_status" ON "users" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_requests_username" ON "requests" ("username")`);
    await queryRunner.query(`CREATE INDEX "idx_requests_email" ON "requests" ("email")`);
    await queryRunner.query(`CREATE INDEX "idx_requests_status" ON "requests" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_groups_name" ON "groups" ("name")`);
    await queryRunner.query(`CREATE INDEX "idx_groups_status" ON "groups" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_user_groups_user_id" ON "user_groups" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_user_groups_group_name" ON "user_groups" ("group_name")`);
    await queryRunner.query(`CREATE INDEX "idx_certificates_fingerprint" ON "certificates" ("fingerprint")`);
    await queryRunner.query(`CREATE INDEX "idx_certificates_user_id" ON "certificates" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_certificates_status" ON "certificates" ("status")`);

    // Create trigger function for automatic certificate revocation
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_user_deactivate_certificates()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.status = 'inactive' AND OLD.status = 'active' THEN
          UPDATE certificates
          SET status = 'revoked',
              revoked_at = CURRENT_TIMESTAMP,
              revoked_by = NEW.updated_by,
              revocation_reason = 'User deactivated',
              updated_by = NEW.updated_by,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = NEW.id
            AND status = 'active';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    await queryRunner.query(`
      CREATE TRIGGER trg_user_deactivate_certificates
      AFTER UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION trg_user_deactivate_certificates();
    `);

    // Insert default "users" group
    await queryRunner.query(`
      INSERT INTO "groups" (name, display_name, description, status, created_at, updated_at)
      VALUES ('users', 'Users', 'Default group for all users', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger first
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_user_deactivate_certificates ON users`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_user_deactivate_certificates()`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "certificates" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_groups" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "groups" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "requests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
  }
} 