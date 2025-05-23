# CertM3 API Database Schema

## Groups Table
                                                     Table "public.groups"
    Column    |           Type           | Collation | Nullable | Default | Storage  | Compression | Stats target | Description 
--------------+--------------------------+-----------+----------+---------+----------+-------------+--------------+-------------
 name         | character varying(255)   |           | not null |         | extended |             |              | 
 display_name | character varying(255)   |           | not null |         | extended |             |              | 
 description  | text                     |           |          |         | extended |             |              | 
 status       | character varying(20)    |           | not null |         | extended |             |              | 
 created_at   | timestamp with time zone |           | not null |         | plain    |             |              | 
 created_by   | character varying(255)   |           |          |         | extended |             |              | 
 updated_at   | timestamp with time zone |           | not null |         | plain    |             |              | 
 updated_by   | character varying(255)   |           |          |         | extended |             |              | 
Indexes:
    "PK_groups" PRIMARY KEY, btree (name)
    "idx_groups_name" btree (name)
    "idx_groups_status" btree (status)
Check constraints:
    "groups_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[]))
Referenced by:
    TABLE "user_groups" CONSTRAINT "FK_user_groups_group_name" FOREIGN KEY (group_name) REFERENCES groups(name)
Access method: heap

## User Groups Table
                                                  Table "public.user_groups"
   Column   |           Type           | Collation | Nullable | Default | Storage  | Compression | Stats target | Description 
------------+--------------------------+-----------+----------+---------+----------+-------------+--------------+-------------
 user_id    | uuid                     |           | not null |         | plain    |             |              | 
 group_name | character varying(255)   |           | not null |         | extended |             |              | 
 created_at | timestamp with time zone |           | not null |         | plain    |             |              | 
 created_by | character varying(255)   |           |          |         | extended |             |              | 
 updated_at | timestamp with time zone |           | not null |         | plain    |             |              | 
 updated_by | character varying(255)   |           |          |         | extended |             |              | 
Indexes:
    "PK_user_groups" PRIMARY KEY, btree (user_id, group_name)
    "idx_user_groups_group_name" btree (group_name)
    "idx_user_groups_user_id" btree (user_id)
Foreign-key constraints:
    "FK_user_groups_group_name" FOREIGN KEY (group_name) REFERENCES groups(name)
    "FK_user_groups_user_id" FOREIGN KEY (user_id) REFERENCES users(id)
Access method: heap

## Users Table
                                                                Table "public.users"
    Column    |           Type           | Collation | Nullable |           Default            | Storage  | Compression | Stats target | Description 
--------------+--------------------------+-----------+----------+------------------------------+----------+-------------+--------------+-------------
 id           | uuid                     |           | not null | uuid_generate_v4()           | plain    |             |              | 
 username     | character varying(255)   |           | not null |                              | extended |             |              | 
 email        | character varying(255)   |           | not null |                              | extended |             |              | 
 status       | character varying(20)    |           | not null |                              | extended |             |              | 
 created_at   | timestamp with time zone |           | not null |                              | plain    |             |              | 
 created_by   | character varying(255)   |           |          |                              | extended |             |              | 
 updated_at   | timestamp with time zone |           | not null |                              | plain    |             |              | 
 updated_by   | character varying(255)   |           |          |                              | extended |             |              | 
 display_name | character varying(255)   |           | not null | 'Unknown'::character varying | extended |             |              | 
Indexes:
    "PK_users" PRIMARY KEY, btree (id)
    "UQ_users_email" UNIQUE CONSTRAINT, btree (email)
    "UQ_users_username" UNIQUE CONSTRAINT, btree (username)
    "idx_users_email" btree (email)
    "idx_users_status" btree (status)
    "idx_users_username" btree (username)
Check constraints:
    "users_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[]))
Referenced by:
    TABLE "certificates" CONSTRAINT "FK_certificates_user_id" FOREIGN KEY (user_id) REFERENCES users(id)
    TABLE "user_groups" CONSTRAINT "FK_user_groups_user_id" FOREIGN KEY (user_id) REFERENCES users(id)
Triggers:
    trg_user_deactivate_certificates AFTER UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trg_user_deactivate_certificates()
Access method: heap

## Certificates Table
                                                          Table "public.certificates"
      Column       |           Type           | Collation | Nullable |      Default       | Storage  | Compression | Stats target | Description 
-------------------+--------------------------+-----------+----------+--------------------+----------+-------------+--------------+-------------
 serial_number     | uuid                     |           | not null | uuid_generate_v4() | plain    |             |              | 
 code_version      | character varying(50)    |           | not null |                    | extended |             |              | 
 username          | character varying(255)   |           | not null |                    | extended |             |              | 
 common_name       | character varying(255)   |           | not null |                    | extended |             |              | 
 email             | character varying(255)   |           | not null |                    | extended |             |              | 
 fingerprint       | text                     |           | not null |                    | extended |             |              | 
 not_before        | timestamp with time zone |           | not null |                    | plain    |             |              | 
 not_after         | timestamp with time zone |           | not null |                    | plain    |             |              | 
 status            | character varying(20)    |           | not null |                    | extended |             |              | 
 revoked_at        | timestamp with time zone |           |          |                    | plain    |             |              | 
 revoked_by        | character varying(255)   |           |          |                    | extended |             |              | 
 revocation_reason | text                     |           |          |                    | extended |             |              | 
 user_id           | uuid                     |           | not null |                    | plain    |             |              | 
 created_at        | timestamp with time zone |           | not null |                    | plain    |             |              | 
 created_by        | character varying(255)   |           |          |                    | extended |             |              | 
 updated_at        | timestamp with time zone |           | not null |                    | plain    |             |              | 
 updated_by        | character varying(255)   |           |          |                    | extended |             |              | 
Indexes:
    "PK_certificates" PRIMARY KEY, btree (serial_number)
    "UQ_certificates_fingerprint" UNIQUE CONSTRAINT, btree (fingerprint)
    "idx_certificates_fingerprint" btree (fingerprint)
    "idx_certificates_status" btree (status)
    "idx_certificates_user_id" btree (user_id)
Check constraints:
    "certificates_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'revoked'::character varying]::text[]))
Foreign-key constraints:
    "FK_certificates_user_id" FOREIGN KEY (user_id) REFERENCES users(id)
Access method: heap

## Requests Table
                                                          Table "public.requests"
    Column    |           Type           | Collation | Nullable |      Default       | Storage  | Compression | Stats target | Description 
--------------+--------------------------+-----------+----------+--------------------+----------+-------------+--------------+-------------
 id           | uuid                     |           | not null | uuid_generate_v4() | plain    |             |              | 
 username     | character varying(255)   |           | not null |                    | extended |             |              | 
 display_name | character varying(255)   |           | not null |                    | extended |             |              | 
 email        | character varying(255)   |           | not null |                    | extended |             |              | 
 status       | character varying(20)    |           | not null |                    | extended |             |              | 
 challenge    | text                     |           |          |                    | extended |             |              | 
 created_at   | timestamp with time zone |           | not null |                    | plain    |             |              | 
 created_by   | character varying(255)   |           |          |                    | extended |             |              | 
 updated_at   | timestamp with time zone |           | not null |                    | plain    |             |              | 
 updated_by   | character varying(255)   |           |          |                    | extended |             |              | 
Indexes:
    "PK_requests" PRIMARY KEY, btree (id)
    "idx_requests_email" btree (email)
    "idx_requests_status" btree (status)
    "idx_requests_username" btree (username)
Check constraints:
    "requests_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[]))
Access method: heap
