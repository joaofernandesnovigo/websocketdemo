import sql from "./db";
import { CHAT_CHANNEL_DOMAIN } from "../constants";
import { Instance, MessageActors, MessageStatus, MessageType } from "../types";
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
 * 
 * @param {string} roomId - O identificador da sala
 * @param {string} botId - O identificador do bot
 * @returns {Promise<MessageDbRow[]>} Lista de mensagens encontradas na sala
 */
export async function getRoomMessages(roomId: string, botId: string) {
    return sql<MessageDbRow[]>`
        SELECT m.*
        FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            JOIN people p ON p.id = c.person_id
        WHERE
            c.bot_id = ${botId}
            AND p.props->>'messagingIdentifier' = ${`${roomId}@${CHAT_CHANNEL_DOMAIN}`}
            AND c.finished_at IS NULL
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
 * 
 * @param {MessageDbRow} message - A mensagem a ser processada e salva
 * @returns {Promise<string>} Uma string contendo informações sobre o processamento realizado
 */
export async function messageSender(message: MessageDbRow, botId: number, originalPersonIdentifier: string) {
    const bot = await sql<Instance[]>`
        SELECT id, name
        FROM bots
        WHERE props->'chat'->>'id' = ${botId}
    `;

    const botData = bot[0];

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

    const person = await findOrCreatePersonByIdentifier(personIdentifier, name, originalPersonIdentifier);

    const conversation = await findOrCreateOpenConversation(person.id, botData.id);


    await sql<{ id: number }[]>`
        INSERT INTO messages (id, conversation_id, "from", "to", type, content, actor, metadata, created_at)
        VALUES (${message.id}, ${conversation.id}, ${message.from}, ${message.to}, ${message.type}, ${message.content}, ${message.actor}, ${JSON.stringify(message.metadata)}, ${message.createdAt})
    `;

    return `Person: Name:${name}/ID:${person.id}/PersonIdentifier: ${personIdentifier}, Conversation: ${conversation.id}, OG Person Identifier: ${originalPersonIdentifier}`;
}
