# Database Design

## Overview
This document outlines the database schema for the certM3 system, which manages certificates, users, and groups.

## Tables

### users
- `id` (UUID, PK): Unique identifier for the user
- `username` (VARCHAR(255)): User's username
- `email` (VARCHAR(255)): User's email address
- `status` (VARCHAR(20)): User status (active, inactive)
- `created_at` (TIMESTAMP WITH TIME ZONE): When the user was created
- `created_by` (VARCHAR(255)): Who created the user
- `updated_at` (TIMESTAMP WITH TIME ZONE): When the user was last updated
- `updated_by` (VARCHAR(255)): Who last modified the user

### requests
- `id` (UUID, PK): Unique identifier for the request
- `username` (VARCHAR(255)): Requested username
- `displayname` (VARCHAR(255)): User's display name
- `email` (VARCHAR(255)): User's email address
- `status` (VARCHAR(20)): Request status (pending, completed, cancelled)
- `challenge` (TEXT): Email validation token
- `created_at` (TIMESTAMP WITH TIME ZONE): When the request was created
- `created_by` (VARCHAR(255)): Who created the request
- `updated_at` (TIMESTAMP WITH TIME ZONE): When the request was last updated
- `updated_by` (VARCHAR(255)): Who last modified the request

### groups
- `name` (VARCHAR(255), PK): Unique name of the group
- `display_name` (VARCHAR(255)): Human-readable group name
- `description` (TEXT): Description of the group
- `created_at` (TIMESTAMP WITH TIME ZONE): When the group was created
- `created_by` (VARCHAR(255)): Who created the group
- `updated_at` (TIMESTAMP WITH TIME ZONE): When the group was last updated
- `updated_by` (VARCHAR(255)): Who last modified the group

### user_groups
- `user_id` (UUID, PK, FK): References users.id
- `group_name` (VARCHAR(255), PK, FK): References groups.name
- `created_at` (TIMESTAMP WITH TIME ZONE): When the user was added to the group
- `created_by` (VARCHAR(255)): Who added the user to the group
- `updated_at` (TIMESTAMP WITH TIME ZONE): When the membership was last updated
- `updated_by` (VARCHAR(255)): Who last modified the membership

### certificates
- `serial_number` (UUID, PK): Unique serial number
- `code_version` (VARCHAR(50)): Version of the code that generated the certificate
- `username` (VARCHAR(255)): Associated username
- `common_name` (VARCHAR(255)): Certificate common name
- `email` (VARCHAR(255)): Certificate email address
- `fingerprint` (TEXT): Unique certificate fingerprint
- `not_before` (TIMESTAMP WITH TIME ZONE): Certificate validity start date
- `not_after` (TIMESTAMP WITH TIME ZONE): Certificate validity end date
- `status` (VARCHAR(20)): Certificate status (absent, present, active, revoked)
- `revoked_at` (TIMESTAMP WITH TIME ZONE): When the certificate was revoked
- `revoked_by` (VARCHAR(255)): Who revoked the certificate
- `revocation_reason` (TEXT): Reason for revocation if applicable
- `user_id` (UUID, FK): References users.id
- `created_at` (TIMESTAMP WITH TIME ZONE): When the certificate was created
- `created_by` (VARCHAR(255)): Who created the certificate
- `updated_at` (TIMESTAMP WITH TIME ZONE): When the certificate was last updated
- `updated_by` (VARCHAR(255)): Who last modified the certificate

## Constraints
1. User email addresses and usernames must be unique
2. Certificate fingerprints must be unique
3. Certificate status must be one of: 'absent', 'present', 'active', 'revoked'
4. Request status must be one of: 'pending', 'completed', 'cancelled'
5. User status must be one of: 'active', 'inactive'
6. Certificate dates (not_before, not_after) must be valid timestamps
7. Users are never deleted, only deactivated (status = 'inactive')
8. Certificates are never deleted, only revoked (status = 'revoked')
9. When a user is deactivated, their certificates are automatically revoked
10. When a user is deactivated, their group memberships are preserved for audit purposes
11. When a group is deleted, all user memberships in that group are automatically deleted (CASCADE)
12. Group names must be unique
13. User-group relationships must be unique (no duplicate memberships)
14. All audit fields (created_by, updated_by, revoked_by) are optional VARCHAR(255)
15. All timestamps include timezone information
16. All string fields use appropriate length constraints

## Indexes
1. `idx_users_username` on users(username)
2. `idx_users_email` on users(email)
3. `idx_users_status` on users(status)
4. `idx_requests_username` on requests(username)
5. `idx_requests_email` on requests(email)
6. `idx_requests_status` on requests(status)
7. `idx_groups_name` on groups(name)
8. `idx_user_groups_user_id` on user_groups(user_id)
9. `idx_user_groups_group_name` on user_groups(group_name)
10. `idx_certificates_fingerprint` on certificates(fingerprint)
11. `idx_certificates_user_id` on certificates(user_id)
12. `idx_certificates_status` on certificates(status)

## Triggers
1. `trg_user_deactivate_certificates`: Automatically revokes all active certificates when a user is deactivated
```sql
CREATE OR REPLACE FUNCTION trg_user_deactivate_certificates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'inactive' AND OLD.status = 'active' THEN
    UPDATE certificates
    SET status = 'revoked',
        revoked_at = CURRENT_TIMESTAMP,
        revoked_by = NEW.updated_by,
        revocation_reason = 'User deactivated'
    WHERE user_id = NEW.id
    AND status IN ('active', 'present');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_deactivate_certificates
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trg_user_deactivate_certificates();
```

## Notes
1. All timestamps are stored with timezone information
2. UUIDs are used for user IDs and request IDs to ensure uniqueness across distributed systems
3. The serial number format follows X.509 certificate serial number conventions
4. Roles are derived from group memberships and not stored directly
5. The database uses PostgreSQL-specific features like `gen_random_uuid()`
6. The "users" group is a special default group that all users are automatically added to
7. Group memberships are reflected in certificate SAN fields
8. Request validation uses email challenge-response mechanism
9. All tables include audit fields (created_by, updated_by) for tracking changes
10. Status fields use VARCHAR(20) with CHECK constraints to ensure valid values
11. String fields use appropriate length constraints for better performance
12. Default values are provided for required fields where appropriate
13. Users and certificates are never deleted from the database, only deactivated/revoked
14. Historical data is preserved for audit and compliance purposes
15. Group memberships are preserved even after user deactivation for audit purposes
16. Automatic triggers handle certificate revocation when users are deactivated 