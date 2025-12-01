import { createChatwootAPI, sendCatalog, sendChatwootMessage, sendEarMap, sendLobuloplastia, sendPortCursoInfan } from "./api";
import { ChatwootSendMessageRequest, ChatwootSendMessageResponse } from "../../types";

/**
 * Serviço principal para comunicação com o Chatwoot.
 */
export class ChatwootService {
    private api: ReturnType<typeof createChatwootAPI>;
    private accountId: number;

    constructor(baseUrl: string, accessToken: string, accountId: number) {
        this.api = createChatwootAPI(baseUrl, accessToken);
        this.accountId = accountId;
    }

    /**
     * Envia uma mensagem de texto via Chatwoot.
     * 
     * @param {number} conversationId - ID da conversa no Chatwoot
     * @param {string} content - Conteúdo da mensagem
     * @returns {Promise<ChatwootSendMessageResponse>} Resposta do Chatwoot
     */
    async sendTextMessage(conversationId: number, content: string): Promise<ChatwootSendMessageResponse> {
        const messageData: ChatwootSendMessageRequest = {
            content,
            message_type: "outgoing"
        };

        return await sendChatwootMessage(this.api, this.accountId, conversationId, messageData);
    }

    async sendCatalogToChatwoot(accountId: number, conversationId: number): Promise<ChatwootSendMessageResponse> {
        return await sendCatalog(this.api, accountId, conversationId);
    }

    async sendEarMapToChatwoot(accountId: number, conversationId: number): Promise<ChatwootSendMessageResponse> {
        return await sendEarMap(this.api, accountId, conversationId);
    }

    async sendPortCursoInfan(accountId: number, conversationId: number): Promise<ChatwootSendMessageResponse> {
        return await sendPortCursoInfan(this.api, accountId, conversationId);
    }

    async sendLobuloplastia(accountId: number, conversationId: number): Promise<ChatwootSendMessageResponse> {
        return await sendLobuloplastia(this.api, accountId, conversationId);
    }

    async sendpPortInfan(accountId: number, conversationId: number): Promise<ChatwootSendMessageResponse> {
        return await sendLobuloplastia(this.api, accountId, conversationId);
    }
}
