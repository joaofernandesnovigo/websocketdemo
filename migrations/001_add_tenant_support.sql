-- Migration: Add Multi-Tenant Support
-- This migration adds tenant isolation to the application

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    props jsonb NULL DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamptz NULL,
    CONSTRAINT tenants_pk PRIMARY KEY (id)
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug) WHERE deleted_at IS NULL;

-- Add tenant_id to bots table
ALTER TABLE public.bots 
ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

ALTER TABLE public.bots 
ADD CONSTRAINT bots_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

CREATE INDEX idx_bots_tenant_id ON public.bots(tenant_id) WHERE tenant_id IS NOT NULL;

-- Add tenant_id to people table
ALTER TABLE public.people 
ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

ALTER TABLE public.people 
ADD CONSTRAINT people_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

CREATE INDEX idx_people_tenant_id ON public.people(tenant_id) WHERE tenant_id IS NOT NULL;

-- Add tenant_id to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

CREATE INDEX idx_conversations_tenant_id ON public.conversations(tenant_id) WHERE tenant_id IS NOT NULL;

-- Add tenant_id to messages table (via conversation, but we can also add directly for performance)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

CREATE INDEX idx_messages_tenant_id ON public.messages(tenant_id) WHERE tenant_id IS NOT NULL;

-- Add tenant_id to files table
ALTER TABLE public.files 
ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

ALTER TABLE public.files 
ADD CONSTRAINT files_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

CREATE INDEX idx_files_tenant_id ON public.files(tenant_id) WHERE tenant_id IS NOT NULL;

-- Function to automatically set tenant_id on messages based on conversation
CREATE OR REPLACE FUNCTION set_message_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM conversations
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_message_tenant_id
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION set_message_tenant_id();

-- Function to automatically set tenant_id on files based on conversation
CREATE OR REPLACE FUNCTION set_file_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM conversations
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_file_tenant_id
BEFORE INSERT ON files
FOR EACH ROW
EXECUTE FUNCTION set_file_tenant_id();

-- Create a default tenant for existing data (optional, for migration purposes)
-- INSERT INTO public.tenants (id, name, slug, props) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Default Tenant', 'default', '{}'::jsonb)
-- ON CONFLICT DO NOTHING;

