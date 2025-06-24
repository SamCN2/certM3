--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: prevent_users_table_deletion(); Type: FUNCTION; Schema: public; Owner: samcn2
--

CREATE FUNCTION public.prevent_users_table_deletion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM groups WHERE name = 'users') THEN
        RAISE EXCEPTION 'Cannot delete the "users" row!';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.prevent_users_table_deletion() OWNER TO samcn2;

--
-- Name: trg_user_deactivate_certificates(); Type: FUNCTION; Schema: public; Owner: samcn2
--

CREATE FUNCTION public.trg_user_deactivate_certificates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
      $$;


ALTER FUNCTION public.trg_user_deactivate_certificates() OWNER TO samcn2;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: certificates; Type: TABLE; Schema: public; Owner: samcn2
--

CREATE TABLE public.certificates (
    serial_number uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code_version character varying(50) NOT NULL,
    username character varying(255) NOT NULL,
    common_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    fingerprint text NOT NULL,
    not_before timestamp with time zone NOT NULL,
    not_after timestamp with time zone NOT NULL,
    status character varying(20) NOT NULL,
    revoked_at timestamp with time zone,
    revoked_by character varying(255),
    revocation_reason text,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp with time zone NOT NULL,
    updated_by character varying(255),
    CONSTRAINT certificates_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'revoked'::character varying])::text[])))
);


ALTER TABLE public.certificates OWNER TO samcn2;

--
-- Name: groups; Type: TABLE; Schema: public; Owner: samcn2
--

CREATE TABLE public.groups (
    name character varying(255) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp with time zone NOT NULL,
    updated_by character varying(255),
    CONSTRAINT groups_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.groups OWNER TO samcn2;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: samcn2
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO samcn2;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: samcn2
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO samcn2;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: samcn2
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: requests; Type: TABLE; Schema: public; Owner: samcn2
--

CREATE TABLE public.requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(255) NOT NULL,
    display_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    status character varying(20) NOT NULL,
    challenge text,
    created_at timestamp with time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp with time zone NOT NULL,
    updated_by character varying(255),
    CONSTRAINT requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.requests OWNER TO samcn2;

--
-- Name: user_groups; Type: TABLE; Schema: public; Owner: samcn2
--

CREATE TABLE public.user_groups (
    user_id uuid NOT NULL,
    group_name character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp with time zone NOT NULL,
    updated_by character varying(255)
);


ALTER TABLE public.user_groups OWNER TO samcn2;

--
-- Name: users; Type: TABLE; Schema: public; Owner: samcn2
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp with time zone NOT NULL,
    updated_by character varying(255),
    display_name character varying(255) DEFAULT 'Unknown'::character varying NOT NULL,
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO samcn2;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: certificates PK_certificates; Type: CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "PK_certificates" PRIMARY KEY (serial_number);


--
-- Name: groups PK_groups; Type: CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT "PK_groups" PRIMARY KEY (name);


--
-- Name: requests PK_requests; Type: CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT "PK_requests" PRIMARY KEY (id);


--
-- Name: user_groups PK_user_groups; Type: CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT "PK_user_groups" PRIMARY KEY (user_id, group_name);


--
-- Name: users PK_users; Type: CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_users" PRIMARY KEY (id);


--
-- Name: certificates UQ_certificates_fingerprint; Type: CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "UQ_certificates_fingerprint" UNIQUE (fingerprint);


--
-- Name: users UQ_users_email; Type: CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_users_email" UNIQUE (email);


--
-- Name: users UQ_users_username; Type: CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_users_username" UNIQUE (username);


--
-- Name: idx_certificates_fingerprint; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_certificates_fingerprint ON public.certificates USING btree (fingerprint);


--
-- Name: idx_certificates_status; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_certificates_status ON public.certificates USING btree (status);


--
-- Name: idx_certificates_user_id; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_certificates_user_id ON public.certificates USING btree (user_id);


--
-- Name: idx_groups_name; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_groups_name ON public.groups USING btree (name);


--
-- Name: idx_groups_status; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_groups_status ON public.groups USING btree (status);


--
-- Name: idx_requests_email; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_requests_email ON public.requests USING btree (email);


--
-- Name: idx_requests_status; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_requests_status ON public.requests USING btree (status);


--
-- Name: idx_requests_username; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_requests_username ON public.requests USING btree (username);


--
-- Name: idx_user_groups_group_name; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_user_groups_group_name ON public.user_groups USING btree (group_name);


--
-- Name: idx_user_groups_user_id; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_user_groups_user_id ON public.user_groups USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: samcn2
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: groups protect_users_row; Type: TRIGGER; Schema: public; Owner: samcn2
--

CREATE TRIGGER protect_users_row BEFORE DELETE ON public.groups FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_users_table_deletion();


--
-- Name: users trg_user_deactivate_certificates; Type: TRIGGER; Schema: public; Owner: samcn2
--

CREATE TRIGGER trg_user_deactivate_certificates AFTER UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trg_user_deactivate_certificates();


--
-- Name: certificates FK_certificates_user_id; Type: FK CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "FK_certificates_user_id" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_groups FK_user_groups_group_name; Type: FK CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT "FK_user_groups_group_name" FOREIGN KEY (group_name) REFERENCES public.groups(name);


--
-- Name: user_groups FK_user_groups_user_id; Type: FK CONSTRAINT; Schema: public; Owner: samcn2
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT "FK_user_groups_user_id" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

