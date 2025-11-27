import sql from "./db";

/**
 * Busca uma conversa aberta existente ou cria uma nova para um usuário e um bot.
 * 
 * @param {string} personId - O identificador da pessoa/usuário
 * @param {number} botId - O identificador numérico do bot
 * @param {string} tenantId - O ID do tenant para filtrar e associar
 * @returns {Promise<{id: string}>} O objeto contendo o ID da conversa encontrada ou criada
 */
export async function findOrCreateOpenConversation (
    personId: string,
    botId: number,
    tenantId?: string,
) {
    const existingConversation = await sql<{ id: string }[]>`
        SELECT c.id
        FROM conversations c
        WHERE finished_at IS NULL
          AND person_id = ${personId}
          AND bot_id = ${botId}
          ${tenantId ? sql`AND c.tenant_id = ${tenantId}` : sql``}
        ORDER BY c.started_at DESC
    `.then(rows => rows[0]);

    if (existingConversation) {
        return existingConversation;
    }

    return await sql<{ id: string }[]>`
        INSERT INTO conversations (person_id, bot_id, target, tenant_id)
        VALUES (${personId}, ${botId}, 'bot', ${tenantId || null})
        RETURNING id
    `.then(rows => rows[0]);
}