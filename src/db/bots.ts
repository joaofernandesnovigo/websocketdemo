import sql from "./db";

export type InstanceDbRow = {
    id: number;
    name: string;
    tenantId?: string;
    props: {
        chat?: {
            id?: string;
            enabled?: boolean;
            clientToken?: string;
            systemToken?: string;
        };
    };
};

/**
 * Busca uma instância de bot pelo ID do chat.
 * 
 * @param {string} id - O ID do chat para buscar a instância correspondente
 * @param {string} tenantId - O ID do tenant para filtrar
 * @returns {Promise<InstanceDbRow|undefined>} A instância encontrada ou undefined se não existir
 */
export async function getInstanceByChatId (id: string, tenantId?: string) {
    if (!id) return undefined;
    return (await sql<InstanceDbRow[]>`
        SELECT b.*
        FROM bots b
        WHERE b.props->'chat'->>'id' = ${id}
          ${tenantId ? sql`AND b.tenant_id = ${tenantId}` : sql``}
        LIMIT 1
    `)[0];
}

/**
 * Busca uma instância de bot pelo seu ID numérico.
 * 
 * @param {number} id - O ID numérico do bot para buscar
 * @param {string} tenantId - O ID do tenant para filtrar
 * @returns {Promise<InstanceDbRow|undefined>} A instância encontrada ou undefined se não existir
 */
export async function getInstanceById (id: number, tenantId?: string) {
    return (await sql<InstanceDbRow[]>`
        SELECT b.*
        FROM bots b
        WHERE b.id = ${id}
          ${tenantId ? sql`AND b.tenant_id = ${tenantId}` : sql``}
        LIMIT 1
    `)[0];
}
