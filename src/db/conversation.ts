import sql from "./db";

/**
 * Busca uma conversa aberta existente ou cria uma nova para um usuário e um bot.
 * 
 * @param {string} personId - O identificador da pessoa/usuário
 * @param {number} botId - O identificador numérico do bot
 * @returns {Promise<{id: string}>} O objeto contendo o ID da conversa encontrada ou criada
 */
export async function findOrCreateOpenConversation (
    personId: string,
    botId: number,
) {
    const existingConversation = await sql<{ id: string }[]>`
        SELECT c.id
        FROM conversations c
        LEFT JOIN desk_tickets dt ON dt.conversation_id = c.id AND dt.closed_at IS NULL
        WHERE finished_at IS NULL
          AND person_id = ${personId}
          AND bot_id = ${botId}
        ORDER BY c.started_at DESC
    `.then(rows => rows[0]);

    if (existingConversation) {
        return existingConversation;
    }

    return await sql<{ id: string }[]>`
        INSERT INTO conversations (person_id, bot_id, target)
        VALUES (${personId}, ${botId}, 'bot')
        RETURNING id
    `.then(rows => rows[0]);
}