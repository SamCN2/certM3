# Database Design

## Overview
This document outlines the database schema for the certM3 system, which manages certificates, users, and groups.

## Tables

### users
- `id` (UUID, PK): Unique identifier for the user
- `username` (VARCHAR(255)): User's username
- `email` (VARCHAR(255)): User's email address
- `password_hash` (VARCHAR(255)): Hashed password
- `is_active` (BOOLEAN): Whether the user account is active
- `created_at` (TIMESTAMP): When the user was created
- `updated_at` (TIMESTAMP): When the user was last updated
- `updated_by` (UUID, FK): ID of the user who last updated this record

### groups
- `name` (VARCHAR(255), PK): Unique name of the group
- `description` (TEXT): Description of the group
- `created_at` (TIMESTAMP): When the group was created
- `updated_at` (TIMESTAMP): When the group was last updated
- `updated_by` (UUID, FK): ID of the user who last updated this record

### user_groups
- `user_id` (UUID, PK, FK): References users.id
- `group_name` (VARCHAR(255), PK, FK): References groups.name
- `created_at` (TIMESTAMP): When the user was added to the group
- `created_by` (UUID, FK): ID of the user who added this user to the group

### certificates
- `id` (UUID, PK): Unique identifier for the certificate
- `user_id` (UUID, FK): References users.id
- `certificate_data` (TEXT): The actual certificate data
- `status` (VARCHAR(50)): Current status of the certificate (active, revoked, expired)
- `revocation_reason` (TEXT): Reason for revocation if applicable
- `revoked_at` (TIMESTAMP): When the certificate was revoked
- `revoked_by` (UUID, FK): ID of the user who revoked the certificate
- `created_at` (TIMESTAMP): When the certificate was created
- `updated_at` (TIMESTAMP): When the certificate was last updated
- `updated_by` (UUID, FK): ID of the user who last updated this record

## Constraints
1. Users cannot be deleted, only deactivated (is_active = false)
2. Certificates cannot be deleted, only revoked (status = 'revoked')
3. The 'users' group is special and cannot be modified or deleted
4. Users cannot be removed from the 'users' group
5. Email addresses must be unique across all users
6. Group names must be unique
7. User-group relationships must be unique

## Indexes
1. `users_email_idx` on users(email)
2. `certificates_user_id_idx` on certificates(user_id)
3. `certificates_status_idx` on certificates(status)
4. `user_groups_user_id_idx` on user_groups(user_id)
5. `user_groups_group_name_idx` on user_groups(group_name)

## Notes
- All tables use UUIDs for IDs to ensure global uniqueness
- Timestamps are in UTC
- Foreign keys ensure referential integrity
- Soft deletion is implemented for users and certificates to maintain audit trail
- The 'users' group is a special system group that all users must belong to 