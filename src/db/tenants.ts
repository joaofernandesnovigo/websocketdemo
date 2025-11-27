import sql from "./db";
import { TenantDbRow } from "../types/tenant";

/**
 * Busca um tenant pelo slug.
 * 
 * @param {string} slug - O slug do tenant
 * @returns {Promise<TenantDbRow|undefined>} O tenant encontrado ou undefined se não existir
 */
export async function getTenantBySlug(slug: string): Promise<TenantDbRow | undefined> {
    if (!slug) return undefined;
    
    return (await sql<TenantDbRow[]>`
        SELECT 
            id,
            name,
            slug,
            props,
            created_at as "createdAt",
            updated_at as "updatedAt",
            deleted_at as "deletedAt"
        FROM tenants
        WHERE slug = ${slug}
          AND deleted_at IS NULL
        LIMIT 1
    `)[0];
}

/**
 * Busca um tenant pelo ID.
 * 
 * @param {string} id - O ID do tenant
 * @returns {Promise<TenantDbRow|undefined>} O tenant encontrado ou undefined se não existir
 */
export async function getTenantById(id: string): Promise<TenantDbRow | undefined> {
    if (!id) return undefined;
    
    return (await sql<TenantDbRow[]>`
        SELECT 
            id,
            name,
            slug,
            props,
            created_at as "createdAt",
            updated_at as "updatedAt",
            deleted_at as "deletedAt"
        FROM tenants
        WHERE id = ${id}
          AND deleted_at IS NULL
        LIMIT 1
    `)[0];
}

/**
 * Cria um novo tenant.
 * 
 * @param {string} name - O nome do tenant
 * @param {string} slug - O slug único do tenant
 * @param {object} props - Propriedades adicionais do tenant
 * @returns {Promise<TenantDbRow>} O tenant criado
 */
export async function createTenant(
    name: string,
    slug: string,
    props: Record<string, any> = {}
): Promise<TenantDbRow> {
    const result = await sql<TenantDbRow[]>`
        INSERT INTO tenants (name, slug, props)
        VALUES (${name}, ${slug}, ${props as never}::jsonb)
        RETURNING 
            id,
            name,
            slug,
            props,
            created_at as "createdAt",
            updated_at as "updatedAt",
            deleted_at as "deletedAt"
    `;
    
    return result[0];
}

