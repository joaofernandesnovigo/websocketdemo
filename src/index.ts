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

const chat = new ChatService({ server });

// Configuração do WAHA
const WAHA_BASE_URL = process.env.WAHA_BASE_URL || "http://54.242.89.184:3000";
const WAHA_SESSION_ID = process.env.WAHA_SESSION_ID || "default";
const wahaService = new WahaService(WAHA_BASE_URL, WAHA_SESSION_ID);
const sessionManager = new WhatsAppSessionManager();

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
server.post("/waha-webhook", { schema: wahaWebhookSchema }, async function handler (request, reply) {
    try {
        const webhookEvent = request.body as WahaWebhookEvent;
        
        server.log.info(`Received WAHA webhook event: ${webhookEvent.event}`, {
            instance: webhookEvent.instance,
            messageId: webhookEvent.data.id,
            from: webhookEvent.data.from,
            to: webhookEvent.data.to,
            type: webhookEvent.data.type
        });

        // Processa apenas mensagens recebidas (não enviadas por nós)
        if (webhookEvent.event === "message.received" && !webhookEvent.data.fromMe) {
            await processWahaMessage(webhookEvent.data);
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
async function processWahaMessage(message: WahaWebhookEvent['data']) {
    try {
        // Cria ou recupera a sessão para esta conversa
        const session = sessionManager.createSessionFromMessage(message);
        
        server.log.info(`Processing message for session: ${session.id}`, {
            phoneNumber: session.phoneNumber,
            whatsappNumber: session.whatsappNumber
        });

        // Processa apenas mensagens de texto por enquanto
        if (message.type === "text" && message.body) {
            // Envia a mensagem para o Flowise
            const response = await sendMessage(session.id, message.body);
            
            server.log.info(`Flowise response received:`, {
                sessionId: session.id,
                responseText: response.data.text,
                chatMessageId: response.data.chatMessageId
            });

            // Envia a resposta de volta para o WhatsApp via WAHA
            const whatsappResponse = await wahaService.sendTextMessage(
                session.whatsappNumber,
                response.data.text
            );

            server.log.info(`Message sent to WhatsApp:`, {
                sessionId: session.id,
                messageId: whatsappResponse.id,
                to: whatsappResponse.to
            });

        } else if (message.hasMedia && message.mediaUrl) {
            // Para mensagens de mídia, por enquanto apenas logamos
            server.log.info(`Media message received (not processed yet):`, {
                sessionId: session.id,
                mediaUrl: message.mediaUrl,
                mediaType: message.type,
                caption: message.caption
            });
        }

    } catch (error) {
        server.log.error("Error processing WAHA message:", error);
    }
}
