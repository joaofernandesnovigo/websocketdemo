import sql from "./db";
import { CHAT_CHANNEL_DOMAIN } from "../constants";
import { Instance, MessageActors, MessageContentMediaLink, MessageStatus, MessageType } from "../types";
import { findOrCreatePersonByIdentifier } from "./people";
import { findOrCreateOpenConversation } from "./conversation";

export type MessageMetadata = {
    "#uniqueId"?: string;
    originalMessage?: string;
    fromLang?: string;
    toLang?: string;
    agent?: {
        id: string;
        name: string;
    };
    message_log_error?: {
        status: MessageStatus;
        timestamp: number;
        errors?: { message?: string }[];
    };
};

export type MessageDbRow = {
    id: string;
    from: string;
    to: string;
    type: MessageType;
    content: string;
    actor: MessageActors;
    metadata: MessageMetadata;
    createdAt: string;
    deliveredAt?: string;
    readAt?: string;
};

/**
 * Busca todas as mensagens de uma sala específica para um determinado bot.
 * @param {string} roomId - O identificador da sala
 * @param {string} botId - O identificador do bot
 * @param {string} tenantId - O ID do tenant para filtrar
 * @returns {Promise<MessageDbRow[]>} Lista de mensagens encontradas na sala
 */
export async function getRoomMessages(roomId: string, botId: string, tenantId?: string) {
    return sql<MessageDbRow[]>`
        SELECT m.*
        FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            JOIN people p ON p.id = c.person_id
        WHERE
            c.bot_id = ${botId}
            AND p.props->>'messagingIdentifier' = ${`${roomId}@${CHAT_CHANNEL_DOMAIN}`}
            AND c.finished_at IS NULL
            ${tenantId ? sql`AND c.tenant_id = ${tenantId}` : sql``}
            AND (
                m.actor = 'user' 
                OR (
                    m.actor = 'assistant'
                    AND (
                        m.type = 'text/plain'
                        OR (
                            m.metadata->'openai'->'choices'->0->'message'->'function_call' IS NULL
                            AND m.metadata->'openai'->'choices'->0->'message'->'tool_calls' IS NULL
                        )
                    )
                )
                OR (m.actor = 'function' AND type = 'application/vnd.lime.media-link+json')
            ) 
        ORDER BY created_at
    `;
}

/**
 * Processa e salva uma mensagem no contexto de uma conversa, criando ou encontrando
 * a pessoa e a conversa associadas.
 * @param {MessageDbRow} message - A mensagem a ser processada e salva
 * @param {string} tenantId - O ID do tenant para filtrar e associar
 * @returns {Promise<string>} Uma string contendo informações sobre o processamento realizado
 */
export async function messageSender(message: MessageDbRow, botId: number, originalPersonIdentifier: string, tenantId?: string) {
    const bot = await sql<Instance[]>`
        SELECT id, name, tenant_id
        FROM bots
        WHERE props->'chat'->>'id' = ${botId}
          ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``}
    `;

    const botData = bot[0];
    if (!botData) {
        throw new Error(`Bot not found for id: ${botId}${tenantId ? ` and tenant: ${tenantId}` : ""}`);
    }

    // Use tenant_id from bot if not provided
    const effectiveTenantId = tenantId || botData.tenantId;

    const nameRegex = message.content.match(/Person Name:(.*?),/);
    let name = "";
    if (nameRegex) {
        name = nameRegex[1];
    }


    const isAttendant = originalPersonIdentifier.includes("@desk.msging.net");
    let personIdentifier = originalPersonIdentifier;

    if (isAttendant) {
        personIdentifier = decodeURIComponent(originalPersonIdentifier.split("@")[0]);
    }

    const person = await findOrCreatePersonByIdentifier(personIdentifier, name, originalPersonIdentifier, effectiveTenantId);

    const conversation = await findOrCreateOpenConversation(person.id, botData.id, effectiveTenantId);


    await sql<{ id: number }[]>`
        INSERT INTO messages (id, conversation_id, "from", "to", type, content, actor, metadata, created_at, tenant_id)
        VALUES (${message.id}, ${conversation.id}, ${message.from}, ${message.to}, ${message.type}, ${message.content}, ${message.actor}, ${JSON.stringify(message.metadata)}, ${message.createdAt}, ${effectiveTenantId || null})
    `;

    // return `Person: Name:${name}/ID:${person.id}/PersonIdentifier: ${personIdentifier}, Conversation: ${conversation.id}, OG Person Identifier: ${originalPersonIdentifier}`;
}

export async function imageSender(message: MessageDbRow, botId: number, originalPersonIdentifier: string, tenantId?: string) {
    const bot = await sql<Instance[]>`
        SELECT id, name, tenant_id
        FROM bots
        WHERE props->'chat'->>'id' = ${botId}
          ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``}
    `;

    const botData = bot[0];
    if (!botData) {
        throw new Error(`Bot not found for id: ${botId}${tenantId ? ` and tenant: ${tenantId}` : ""}`);
    }

    // Use tenant_id from bot if not provided
    const effectiveTenantId = tenantId || botData.tenantId;

    const nameRegex = message.content.match(/Person Name:(.*?),/);
    let name = "";
    if (nameRegex) {
        name = nameRegex[1];
    }


    const isAttendant = originalPersonIdentifier.includes("@desk.msging.net");
    let personIdentifier = originalPersonIdentifier;

    if (isAttendant) {
        personIdentifier = decodeURIComponent(originalPersonIdentifier.split("@")[0]);
    }

    const person = await findOrCreatePersonByIdentifier(personIdentifier, name, originalPersonIdentifier, effectiveTenantId);

    const conversation = await findOrCreateOpenConversation(person.id, botData.id, effectiveTenantId);

    const messageContent: MessageContentMediaLink = JSON.parse(message.content);

    // Insert into messages
    await sql<{ id: number }[]>`
        INSERT INTO messages (id, conversation_id, "from", "to", type, content, actor, metadata, created_at, tenant_id)
        VALUES (${message.id}, ${conversation.id}, ${message.from}, ${message.to}, ${message.type}, ${message.content}, ${message.actor}, ${JSON.stringify(message.metadata)}, ${message.createdAt}, ${effectiveTenantId || null})
    `;

    await sql<{ id: number }[]>`
        INSERT INTO files (id, conversation_id, "type", "title", "uri", created_at, tenant_id)
        VALUES (${message.id}, ${conversation.id}, ${messageContent.type!}, ${messageContent.title!}, ${messageContent.uri!}, ${message.createdAt}, ${effectiveTenantId || null})
    `;

}
