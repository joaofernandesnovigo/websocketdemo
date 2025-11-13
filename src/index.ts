import { join } from "node:path";
import { readFile } from "node:fs/promises";
import Fastify from "fastify";
import FastifySocketIo from "fastify-socket.io";
import { ChatService } from "./chat-service";
import { ServerOptions } from "socket.io";
import { receiveMessageSchema } from "./schema";
import { MiaMessageDto, MiaRequestParams, ChatwootWebhookEvent } from "./types";
import { ChatwootService } from "./serivces/chatwoot/chatwoot";
import { ChatwootSessionManager } from "./serivces/chatwoot/session-manager";
import { sendMessage } from "./serivces/flowise/flowise";
import { sendCatalog } from "./serivces/chatwoot/api";

const server = Fastify({
    logger: !!process.env.SERVER_DEBUG && process.env.SERVER_DEBUG !== "false",
});
server.register(FastifySocketIo, {
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1e3,
    },
    cors: {},
} as ServerOptions);

server.get("/", { logLevel: "warn" }, async function handler (request, reply) {
    const data = await readFile(join(process.cwd(), "public/index.html"));
    reply.header("content-type", "text/html; charset=utf-8");
    reply.send(data);
});

server.get("/health-check", { logLevel: "warn" }, async function handler () {});
server.get("/favicon.ico", { logLevel: "warn" }, async function handler () {});
server.get("/mia-chat-api", { logLevel: "warn" }, async function handler () {}); // TODO check why lb call that

// Endpoint para monitorar sessões ativas do Chatwoot
server.get("/chatwoot-sessions", { logLevel: "warn" }, async function handler () {
    const activeSessions = sessionManager.getActiveSessions();
    const stats = sessionManager.getStats();
    
    return {
        stats,
        sessions: activeSessions.map(session => ({
            id: session.id,
            conversationId: session.conversationId,
            contactId: session.contactId,
            sourceId: session.sourceId,
            inboxId: session.inboxId,
            lastActivity: session.lastActivity,
            isActive: session.isActive
        }))
    };
});

// Endpoint de teste para webhook
server.post("/test-webhook", async function handler (request, reply) {
    try {
        server.log.info("Test webhook received:", request.body);
        return { success: true, message: "Test webhook received", data: request.body };
    } catch (error) {
        server.log.error("Error in test webhook:", error);
        return reply.status(500).send({ success: false, message: "Error" });
    }
});

// Endpoint de debug para capturar dados do Chatwoot
server.post("/debug-chatwoot", async function handler (request, reply) {
    try {
        console.log("=== CHATWOOT DEBUG DATA ===");
        console.log("Headers:", JSON.stringify(request.headers, null, 2));
        console.log("Body:", JSON.stringify(request.body, null, 2));
        console.log("=========================");
        
        server.log.info("Chatwoot Debug Data:", {
            headers: request.headers,
            body: request.body
        });
        
        return { 
            success: true, 
            message: "Debug data captured",
            receivedAt: new Date().toISOString(),
            data: request.body
        };
    } catch (error) {
        server.log.error("Error in debug webhook:", error);
        return reply.status(500).send({ success: false, message: "Error" });
    }
});

// Endpoint para testar envio de mensagem via Chatwoot
server.post("/test-send-chatwoot", async function handler (request, reply) {
    try {
        const { conversationId, text } = request.body as { conversationId: number; text: string };
        
        if (!conversationId || !text) {
            return reply.status(400).send({ 
                success: false, 
                message: "conversationId and text are required" 
            });
        }
        
        server.log.info("Testing Chatwoot send message:", { conversationId, text });
        
        const response = await chatwootService.sendTextMessage(conversationId, text);
        
        return { 
            success: true, 
            message: "Message sent successfully",
            response: response
        };
    } catch (error) {
        server.log.error("Error testing Chatwoot send:", error);
        return reply.status(500).send({ 
            success: false, 
            message: "Error sending message",
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

const chat = new ChatService({ server });

// Configuração do Chatwoot
const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL || "http://localhost:3000";
const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN || "";
const CHATWOOT_ACCOUNT_ID = parseInt(process.env.CHATWOOT_ACCOUNT_ID || "1", 10);
const chatwootService = new ChatwootService(CHATWOOT_BASE_URL, CHATWOOT_ACCESS_TOKEN, CHATWOOT_ACCOUNT_ID);
const sessionManager = new ChatwootSessionManager();

// Set para rastrear mensagens já processadas e evitar duplicação
const processedMessages = new Set<number>();

// Log das configurações
server.log.info("Chatwoot Configuration:", {
    CHATWOOT_BASE_URL,
    CHATWOOT_ACCOUNT_ID,
    IA_GATEWAY: process.env.IA_GATEWAY,
    CHATFLOW_ID: process.env.CHATFLOW_ID
});

server.ready((err) => {
    if (err) throw err;

    chat.connect();
    
    // Limpa sessões inativas a cada 30 minutos
    setInterval(() => {
        sessionManager.cleanupInactiveSessions(30);
        server.log.info("Cleaned up inactive Chatwoot sessions");
    }, 30 * 60 * 1000);
});

server.listen({
    port: +(process.env.PORT || 3000),
    host: process.env.HOST || "127.0.0.1",
}, function (err) {
    if (err) {
        server.log.error(err);
        process.exit(1);
    }
    server.log.info("Server initialized");
});

server.post("/receive-message/:instanceId", { schema: receiveMessageSchema }, async function handler (request) {
    const token = request.headers.token as string;
    const { instanceId } = request.params as MiaRequestParams;

    const instance = await chat.getInstanceForSystemMessage(instanceId, token);

    const message = request.body as MiaMessageDto;
    chat.sendSystemMessage(instance, message);
});

server.post("/sendcatalog", async function handler (request) {
    const data = request.body as any;
    const accountId = data.account_id as number;
    const conversationId = data.conversation_id as number;
    const response = chatwootService.sendCatalogToChatwoot(accountId, conversationId);
})

// Webhook endpoint para receber mensagens do Chatwoot
server.post("/chatwoot-webhook", async function handler (request, reply) {
    try {
        // Log do body completo para debug
        server.log.info("Chatwoot webhook received:", JSON.stringify(request.body, null, 2));
        console.log("Chatwoot webhook received:", JSON.stringify(request.body, null, 2));

        const webhookData = request.body as any;
        
        // Verifica se é um evento de mensagem criada ou conversa criada (primeira mensagem)
        // Prioriza message_created sobre conversation_created para evitar duplicação
        if (webhookData.event === "message_created" || webhookData.event === "conversation_created") {
            // No formato real do Chatwoot, os dados da mensagem estão no nível raiz
            // Para conversation_created, a mensagem pode estar em conversation.messages[0]
            let message;
            if (webhookData.event === "conversation_created") {
                // Tenta pegar a primeira mensagem do array messages
                const firstMessage = webhookData.messages?.[0] || webhookData.conversation?.messages?.[0];
                message = firstMessage || {
                    id: webhookData.id,
                    content: webhookData.content,
                    message_type: webhookData.message_type || 0,
                    conversation_id: webhookData.conversation?.id || webhookData.id,
                    inbox_id: webhookData.inbox_id || webhookData.inbox?.id,
                    source_id: webhookData.source_id,
                    sender: webhookData.sender
                };
            } else {
                message = {
                    id: webhookData.id,
                    content: webhookData.content,
                    message_type: webhookData.message_type,
                    conversation_id: webhookData.conversation?.id,
                    inbox_id: webhookData.inbox?.id,
                    source_id: webhookData.source_id,
                    sender: webhookData.sender
                };
            }
            const conversation = webhookData.conversation || webhookData;
            
            server.log.info(`Processing Chatwoot message event:`, {
                event: webhookData.event,
                messageId: message.id,
                conversationId: conversation?.id,
                messageType: message.message_type,
                content: message.content
            });

            // Processa apenas mensagens recebidas (incoming)
            // No Chatwoot: message_type 0 = incoming, 1 = outgoing
            // Ou pode ser string: "incoming" / "outgoing"
            const isIncoming = message && (
                message.message_type === "incoming" || 
                message.message_type === 0 ||
                (typeof message.message_type === "number" && message.message_type === 0)
            );
            
            // Para conversation_created, só processa se for incoming e não tiver sido processado via message_created
            // Prioriza message_created sobre conversation_created
            const shouldProcess = isIncoming 
                && conversation 
                && message 
                && message.content;
            
            if (shouldProcess) {
                // Verifica se a mensagem já foi processada (evita duplicação)
                if (message.id && processedMessages.has(message.id)) {
                    server.log.info(`Message ${message.id} already processed, skipping duplicate`);
                    return { success: true, message: "Message already processed" };
                }
                
                // VERIFICAÇÃO DO TIME - DEVE SER FEITA ANTES DE PROCESSAR
                // Se o time não estiver definido (primeira mensagem), permite processar
                // Se o time estiver definido e não for "ia", bloqueia
                const teamName = conversation?.meta?.team?.name || webhookData?.conversation?.meta?.team?.name;
                const hasTeam = teamName !== undefined && teamName !== null;
                const isIATeam = teamName === "ia";
                
                server.log.info(`[WEBHOOK] Team check - Team: ${teamName || "none"} - Has Team: ${hasTeam} - Is IA: ${isIATeam}`);
                
                // Se o time estiver definido E não for "ia", bloqueia
                // Se o time não estiver definido (primeira mensagem), permite processar
                if (hasTeam && !isIATeam) {
                    server.log.info(`Blocking message processing - team is not "ia" (current team: ${teamName})`);
                    return { success: true, message: "Message blocked - team is not 'ia'" };
                }
                
                // Marca a mensagem como processada ANTES de processar
                if (message.id) {
                    processedMessages.add(message.id);
                    // Limpa mensagens antigas do Set (mantém apenas as últimas 1000)
                    if (processedMessages.size > 1000) {
                        const firstId = Array.from(processedMessages)[0];
                        processedMessages.delete(firstId);
                    }
                }
                
                // Permite processar se: time não está definido (primeira msg) OU time é "ia"
                await processChatwootMessage(message, conversation, webhookData);
            } else {
                server.log.info("Skipping outgoing message or missing conversation");
            }
        } else {
            server.log.info(`Unknown or unhandled event type: ${webhookData.event}`);
        }

        return { success: true, message: "Webhook processed successfully" };
    } catch (error) {
        server.log.error("Error processing Chatwoot webhook:", error);
        return reply.status(500).send({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

// Função para processar mensagens recebidas do Chatwoot
async function processChatwootMessage(message: any, conversation: any, webhookData: any) {
    try {
        // Verifica se o time atribuído é "ia" - ANTES DE QUALQUER PROCESSAMENTO
        // Se o time não estiver definido (primeira mensagem), permite processar
        // Se o time estiver definido e não for "ia", bloqueia
        const teamName = conversation?.meta?.team?.name || webhookData?.conversation?.meta?.team?.name;
        const hasTeam = teamName !== undefined && teamName !== null;
        const isIATeam = teamName === "ia";
        
        server.log.info(`[TEAM CHECK] Conversation ${conversation?.id} - Team: ${teamName || "none"} - Has Team: ${hasTeam} - Is IA: ${isIATeam}`);
        
        // Se o time estiver definido E não for "ia", bloqueia
        // Se o time não estiver definido (primeira mensagem), permite processar
        if (hasTeam && !isIATeam) {
            server.log.info(`Skipping Flowise processing - team is not "ia" (current team: ${teamName})`);
            return;
        }
        
        server.log.info("Processing Chatwoot message:", JSON.stringify(message, null, 2));
        
        // Valida se a mensagem e conversa têm os campos necessários
        if (!message.content || !conversation.id) {
            server.log.error("Message missing required fields (content/conversation.id):", JSON.stringify({ message, conversation }, null, 2));
            console.log("Message missing required fields:", JSON.stringify({ message, conversation }, null, 2));
            return;
        }
        
        // Extrai informações necessárias
        // O source_id está em conversation.contact_inbox.source_id ou pode ser extraído do sender
        const contact = conversation.meta?.sender || conversation.contact;
        const sourceId = conversation.contact_inbox?.source_id || 
                        contact?.source_id || 
                        conversation.source_id ||
                        message.sender?.phone_number?.replace(/\D/g, '');
        const inboxId = conversation.inbox_id || message.inbox_id;
        const contactId = conversation.contact_inbox?.contact_id || 
                         conversation.meta?.sender?.id || 
                         contact?.id;
        
        // Cria ou recupera a sessão para esta conversa
        const session = sessionManager.getOrCreateSession(
            conversation.id,
            contactId || 0,
            sourceId || "unknown",
            inboxId
        );
        
        server.log.info(`Processing message for session: ${session.id}`, {
            conversationId: session.conversationId,
            sourceId: session.sourceId,
            contactId: session.contactId
        });

        // Processa apenas mensagens de texto por enquanto
        // Verifica se é mensagem de texto (content_type === "text" ou não tem attachments)
        const isTextMessage = message.content && 
                             (webhookData.content_type === "text" || 
                              !webhookData.content_attributes?.attachments || 
                              (Array.isArray(webhookData.content_attributes?.attachments) && 
                               webhookData.content_attributes.attachments.length === 0));
        
        if (isTextMessage) {
            
            server.log.info(`Sending text message to Flowise: ${message.content}`);
            
            try {
                // Envia a mensagem para o Flowise
                const response = await sendMessage(session.id, message.content);
                
                server.log.info(`Flowise response received:`, {
                    sessionId: session.id,
                    responseText: response.data.text,
                    chatMessageId: response.data.chatMessageId
                });

                // Envia a resposta de volta para o Chatwoot
                server.log.info(`Sending response to Chatwoot: ${response.data.text}`);
                server.log.info(`Chatwoot Service Config:`, {
                    baseUrl: CHATWOOT_BASE_URL,
                    accountId: CHATWOOT_ACCOUNT_ID,
                    conversationId: session.conversationId
                });
                
                try {
                    const chatwootResponse = await chatwootService.sendTextMessage(
                        session.conversationId,
                        response.data.text
                    );

                    server.log.info(`Message sent to Chatwoot successfully:`, {
                        sessionId: session.id,
                        messageId: chatwootResponse.id,
                        conversationId: chatwootResponse.conversation_id,
                        response: chatwootResponse
                    });
                } catch (error: any) {
                    console.log('=== CHATWOOT ERROR DETAILS ===');
                    console.log('Error object:', error);
                    console.log('Error message:', error.message);
                    console.log('Error code:', error.code);
                    console.log('Error response status:', error.response?.status);
                    console.log('Error response statusText:', error.response?.statusText);
                    console.log('Error response headers:', error.response?.headers);
                    console.log('Error response data:', error.response?.data);
                    console.log('Error config:', error.config);
                    console.log('========================');
                    
                    server.log.error(`Error sending message to Chatwoot:`, {
                        error: error instanceof Error ? error.message : String(error),
                        code: error.code,
                        status: error.response?.status,
                        statusText: error.response?.statusText,
                        responseData: error.response?.data,
                        stack: error instanceof Error ? error.stack : undefined,
                        sessionId: session.id,
                        conversationId: session.conversationId,
                        message: response.data.text
                    });
                }
            } catch (flowiseError: any) {
                server.log.error(`Error sending message to Flowise:`, {
                    error: flowiseError instanceof Error ? flowiseError.message : String(flowiseError),
                    code: flowiseError.code,
                    status: flowiseError.response?.status,
                    statusText: flowiseError.response?.statusText,
                    responseData: flowiseError.response?.data,
                    stack: flowiseError instanceof Error ? flowiseError.stack : undefined,
                    sessionId: session.id,
                    message: message.content
                });
                console.error("=== FLOWISE ERROR DETAILS ===");
                console.error("Error:", flowiseError);
                console.error("Error message:", flowiseError instanceof Error ? flowiseError.message : String(flowiseError));
                console.error("Error stack:", flowiseError instanceof Error ? flowiseError.stack : undefined);
                console.error("Error response:", flowiseError.response?.data);
                console.error("===========================");
                throw flowiseError; // Re-throw para ser capturado pelo catch externo
            }

        } else if (webhookData.content_type !== "text" || webhookData.content_attributes?.attachments) {
            // Para mensagens com anexos ou mídia, por enquanto apenas logamos
            server.log.info(`Message with attachments/media received (not processed yet):`, {
                sessionId: session.id,
                contentType: webhookData.content_type,
                content: message.content
            });
        } else {
            server.log.info(`Unsupported message format:`, {
                sessionId: session.id,
                message: message
            });
        }

    } catch (error) {
        server.log.error("Error processing Chatwoot message:", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            message: message,
            conversation: conversation
        });
        console.error("=== CHATWOOT PROCESSING ERROR ===");
        console.error("Error:", error);
        console.error("Error message:", error instanceof Error ? error.message : String(error));
        console.error("Error stack:", error instanceof Error ? error.stack : undefined);
        console.error("Message data:", JSON.stringify(message, null, 2));
        console.error("Conversation data:", JSON.stringify(conversation, null, 2));
        console.error("==================================");
    }
}
