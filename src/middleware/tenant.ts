import { FastifyRequest, FastifyReply } from "fastify";
import { getTenantBySlug, getTenantById } from "../db/tenants";
import { TenantContext } from "../types/tenant";

/**
 * Extends FastifyRequest to include tenant context
 */
declare module "fastify" {
    interface FastifyRequest {
        tenant?: TenantContext;
    }
}

/**
 * Identifies tenant from request headers or subdomain
 * Supports:
 * - X-Tenant-ID header (tenant UUID)
 * - X-Tenant-Slug header (tenant slug)
 * - Subdomain extraction from Host header
 */
export async function identifyTenant(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<TenantContext | null> {
    // Try to get tenant from headers first
    const tenantId = request.headers["x-tenant-id"] as string | undefined;
    const tenantSlug = request.headers["x-tenant-slug"] as string | undefined;

    let tenant;

    if (tenantId) {
        tenant = await getTenantById(tenantId);
    } else if (tenantSlug) {
        tenant = await getTenantBySlug(tenantSlug);
    } else {
        // Try to extract from subdomain
        const host = request.headers.host as string | undefined;
        if (host) {
            const subdomain = extractSubdomain(host);
            if (subdomain) {
                tenant = await getTenantBySlug(subdomain);
            }
        }
    }

    if (!tenant) {
        return null;
    }

    return {
        tenantId: tenant.id,
        tenant,
    };
}

/**
 * Extracts subdomain from host header
 * Example: tenant1.example.com -> tenant1
 */
function extractSubdomain(host: string): string | null {
    const parts = host.split(".");
    // If we have at least 3 parts (subdomain.domain.tld), return the subdomain
    if (parts.length >= 3) {
        // Skip 'www' if present
        const subdomain = parts[0] === "www" ? parts[1] : parts[0];
        // Don't treat common prefixes as subdomains
        if (subdomain && !["api", "www", "app"].includes(subdomain.toLowerCase())) {
            return subdomain;
        }
    }
    return null;
}

/**
 * Fastify hook to attach tenant context to requests
 */
export async function tenantHook(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const tenantContext = await identifyTenant(request, reply);
    
    if (tenantContext) {
        request.tenant = tenantContext;
    } else {
        // For WebSocket connections, tenant might be optional
        // For HTTP endpoints, you might want to return 401/403
        // Uncomment below if you want to enforce tenant on all requests:
        // return reply.status(401).send({ error: "Tenant not found" });
    }
}

