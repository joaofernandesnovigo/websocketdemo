/**
 * Tenant-related types for multi-tenant support
 */

export type TenantDbRow = {
    id: string;
    name: string;
    slug: string;
    props: TenantProps;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
};

export type TenantProps = {
    chatwoot?: {
        baseUrl?: string;
        accessToken?: string;
        accountId?: number;
    };
    flowise?: {
        baseUrl?: string;
        apiKey?: string;
        chatflowId?: string;
    };
    openai?: {
        apiKey?: string;
        model?: string;
    };
    aws?: {
        region?: string;
        bucket?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
    };
    [key: string]: any;
};

export type TenantContext = {
    tenantId: string;
    tenant: TenantDbRow;
};

