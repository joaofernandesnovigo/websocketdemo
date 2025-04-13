-- Extension: plpgsql

-- DROP EXTENSION plpgsql;

CREATE EXTENSION plpgsql
	SCHEMA "pg_catalog"
	VERSION '1.0';

-- Extension: cube

-- DROP EXTENSION cube;

CREATE EXTENSION cube
	SCHEMA "public"
	VERSION '1.5';

-- Extension: earthdistance

-- DROP EXTENSION earthdistance;

CREATE EXTENSION earthdistance
	SCHEMA "public"
	VERSION '1.1';

-- Extension: pg_trgm

-- DROP EXTENSION pg_trgm;

CREATE EXTENSION pg_trgm
	SCHEMA "public"
	VERSION '1.6';

-- Extension: pgcrypto

-- DROP EXTENSION pgcrypto;

CREATE EXTENSION pgcrypto
	SCHEMA "public"
	VERSION '1.3';

-- Extension: unaccent

-- DROP EXTENSION unaccent;

CREATE EXTENSION unaccent
	SCHEMA "public"
	VERSION '1.1';

-- Extension: uuid-ossp

-- DROP EXTENSION uuid-ossp;

CREATE EXTENSION "uuid-ossp"
	SCHEMA "public"
	VERSION '1.1';



-- public.bots definição

-- Drop table

-- DROP TABLE public.bots;

CREATE TABLE public.bots (
	id serial4 NOT NULL,
	"name" text NULL,
	props jsonb NULL,
	CONSTRAINT bots_pk PRIMARY KEY (id)
);



-- public.people definição

-- Drop table

-- DROP TABLE public.people;

CREATE TABLE public.people (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NULL,
	email text NULL,
	phone_number text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	deleted_at timestamptz NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	props jsonb NULL,
	CONSTRAINT people_pk PRIMARY KEY (id)
);



-- public.conversations definição

-- Drop table

-- DROP TABLE public.conversations;

CREATE TABLE public.conversations (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	person_id uuid NOT NULL,
	target text NOT NULL,
	started_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	finished_at timestamptz NULL,
	bot_id int4 NULL,
	props jsonb null,
	CONSTRAINT conversations_pk PRIMARY KEY (id)
);


-- public.conversations chaves estrangeiras

ALTER TABLE public.conversations ADD CONSTRAINT conversations_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id);
ALTER TABLE public.conversations ADD CONSTRAINT conversations_people_id_fk FOREIGN KEY (person_id) REFERENCES public.people(id);



-- public.messages definição

-- Drop table

-- DROP TABLE public.messages;

CREATE TYPE public."message_actor" AS ENUM (
	'system',
	'assistant',
	'user',
	'function');


CREATE TABLE public.messages (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	conversation_id uuid NOT NULL,
	actor public."message_actor" NOT NULL,
	"from" text NULL,
	"to" text NULL,
	"type" text NULL,
	"content" text NULL,
	metadata jsonb NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT messages_pk PRIMARY KEY (id)
);

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id) WITH (deduplicate_items='false');

-- public.messages chaves estrangeiras

ALTER TABLE public.messages ADD CONSTRAINT messages_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);
