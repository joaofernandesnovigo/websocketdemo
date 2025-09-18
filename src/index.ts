import { join } from "node:path";
import { readFile } from "node:fs/promises";
import Fastify from "fastify";
import FastifySocketIo from "fastify-socket.io";
import { ChatService } from "./chat-service";
import { ServerOptions } from "socket.io";
import { receiveMessageSchema, wahaWebhookSchema } from "./schema";
import { MiaMessageDto, MiaRequestParams, WahaWebhookEvent } from "./types";
import { WahaService } from "./serivces/waha/waha";
import { WhatsAppSessionManager } from "./serivces/waha/session-manager";
import { sendMessage } from "./serivces/flowise/flowise";

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

// Endpoint para monitorar sessões ativas do WhatsApp
server.get("/whatsapp-sessions", { logLevel: "warn" }, async function handler () {
    const activeSessions = sessionManager.getActiveSessions();
    const stats = sessionManager.getStats();
    
    return {
        stats,
        sessions: activeSessions.map(session => ({
            id: session.id,
            phoneNumber: session.phoneNumber,
            whatsappNumber: session.whatsappNumber,
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

// Endpoint de debug para capturar dados do WAHA
server.post("/debug-waha", async function handler (request, reply) {
    try {
        console.log("=== WAHA DEBUG DATA ===");
        console.log("Headers:", JSON.stringify(request.headers, null, 2));
        console.log("Body:", JSON.stringify(request.body, null, 2));
        console.log("=========================");
        
        server.log.info("WAHA Debug Data:", {
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

const chat = new ChatService({ server });

// Configuração do WAHA
const WAHA_BASE_URL = process.env.WAHA_BASE_URL || "http://54.242.89.184:3000";
const WAHA_SESSION_ID = process.env.WAHA_SESSION_ID || "default";
const wahaService = new WahaService(WAHA_BASE_URL, WAHA_SESSION_ID);
const sessionManager = new WhatsAppSessionManager();

// Log das configurações
server.log.info("WAHA Configuration:", {
    WAHA_BASE_URL,
    WAHA_SESSION_ID,
    IA_GATEWAY: process.env.IA_GATEWAY,
    CHATFLOW_ID: process.env.CHATFLOW_ID
});

server.ready((err) => {
    if (err) throw err;

    chat.connect();
    
    // Limpa sessões inativas a cada 30 minutos
    setInterval(() => {
        sessionManager.cleanupInactiveSessions(30);
        server.log.info("Cleaned up inactive WhatsApp sessions");
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

// Webhook endpoint para receber mensagens do WAHA
server.post("/waha-webhook", async function handler (request, reply) {
    try {
        // Log do body completo para debug
        server.log.info("WAHA webhook received:", JSON.stringify(request.body, null, 2));
        console.log("WAHA webhook received:", JSON.stringify(request.body, null, 2));

        const webhookData = request.body as any;
        
        // Verifica se é um evento de mensagem
        if (webhookData.event === "message" || webhookData.event === "message.received" || !webhookData.event) {
            // Extrai a mensagem do payload (formato real do WAHA)
            const message = webhookData.payload || webhookData.data || webhookData;
            
            server.log.info(`Processing WAHA message event:`, {
                event: webhookData.event,
                session: webhookData.session,
                engine: webhookData.engine,
                messageId: message.id,
                from: message.from,
                to: message.to,
                body: message.body,
                fromMe: message.fromMe,
                hasMedia: message.hasMedia
            });

            // Processa apenas mensagens recebidas (não enviadas por nós)
            if (!message.fromMe) {
                await processWahaMessage(message);
            } else {
                server.log.info("Skipping message sent by us");
            }
        } else {
            server.log.info(`Unknown event type: ${webhookData.event}`);
        }

        return { success: true, message: "Webhook processed successfully" };
    } catch (error) {
        server.log.error("Error processing WAHA webhook:", error);
        return reply.status(500).send({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

// Função para processar mensagens recebidas do WAHA
async function processWahaMessage(message: any) {
    try {
        server.log.info("Processing WAHA message:", JSON.stringify(message, null, 2));
        
        // Valida se a mensagem tem os campos necessários
        if (!message.from || !message.to) {
            server.log.error("Message missing required fields (from/to):", JSON.stringify(message, null, 2));
            console.log("Message missing required fields (from/to):", JSON.stringify(message, null, 2));
            return;
        }
        
        // Cria ou recupera a sessão para esta conversa
        const session = sessionManager.createSessionFromMessage(message);
        
        server.log.info(`Processing message for session: ${session.id}`, {
            phoneNumber: session.phoneNumber,
            whatsappNumber: session.whatsappNumber
        });

        // Processa apenas mensagens de texto por enquanto
        if (message.body && !message.hasMedia) {
            server.log.info(`Sending text message to Flowise: ${message.body}`);
            
            // Envia a mensagem para o Flowise
            const response = await sendMessage(session.id, message.body);
            
            server.log.info(`Flowise response received:`, {
                sessionId: session.id,
                responseText: response.data.text,
                chatMessageId: response.data.chatMessageId
            });

            // Envia a resposta de volta para o WhatsApp via WAHA
            server.log.info(`Sending response to WhatsApp: ${response.data.text}`);
            const whatsappResponse = await wahaService.sendTextMessage(
                session.whatsappNumber,
                response.data.text
            );

            server.log.info(`Message sent to WhatsApp:`, {
                sessionId: session.id,
                messageId: whatsappResponse.id,
                to: whatsappResponse.to
            });

        } else if (message.hasMedia) {
            // Para mensagens de mídia, por enquanto apenas logamos
            server.log.info(`Media message received (not processed yet):`, {
                sessionId: session.id,
                hasMedia: message.hasMedia,
                body: message.body
            });
        } else {
            server.log.info(`Unsupported message format:`, {
                sessionId: session.id,
                message: message
            });
        }

    } catch (error) {
        server.log.error("Error processing WAHA message:", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            message: message
        });
    }
}
