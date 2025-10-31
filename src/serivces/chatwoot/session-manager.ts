import { v4 } from "uuid";

/**
 * Interface para uma sessão de conversa do Chatwoot.
 */
export interface ChatwootSession {
    id: string;
    conversationId: number;
    contactId: number;
    sourceId: string; // ID do contato no WhatsApp (ex: 5511999999999)
    inboxId: number;
    lastActivity: Date;
    isActive: boolean;
}

/**
 * Gerenciador de sessões para conversas do Chatwoot.
 */
export class ChatwootSessionManager {
    private sessions: Map<string, ChatwootSession> = new Map();
    private conversationToSessionId: Map<number, string> = new Map();
    private sourceIdToSessionId: Map<string, string> = new Map();

    /**
     * Cria ou recupera uma sessão para uma conversa do Chatwoot.
     * 
     * @param {number} conversationId - ID da conversa no Chatwoot
     * @param {number} contactId - ID do contato no Chatwoot
     * @param {string} sourceId - ID do contato no WhatsApp (source_id)
     * @param {number} inboxId - ID da inbox no Chatwoot
     * @returns {ChatwootSession} Sessão da conversa
     */
    getOrCreateSession(
        conversationId: number,
        contactId: number,
        sourceId: string,
        inboxId: number
    ): ChatwootSession {
        // Verifica se já existe uma sessão para esta conversa
        const existingSessionId = this.conversationToSessionId.get(conversationId);
        if (existingSessionId) {
            const session = this.sessions.get(existingSessionId);
            if (session) {
                // Atualiza a última atividade
                session.lastActivity = new Date();
                return session;
            }
        }

        // Verifica se existe uma sessão pelo sourceId
        const existingSourceSessionId = this.sourceIdToSessionId.get(sourceId);
        if (existingSourceSessionId) {
            const session = this.sessions.get(existingSourceSessionId);
            if (session) {
                // Atualiza a conversa e última atividade
                session.conversationId = conversationId;
                session.lastActivity = new Date();
                this.conversationToSessionId.set(conversationId, existingSourceSessionId);
                return session;
            }
        }

        // Cria uma nova sessão
        const sessionId = v4();
        const session: ChatwootSession = {
            id: sessionId,
            conversationId,
            contactId,
            sourceId,
            inboxId,
            lastActivity: new Date(),
            isActive: true
        };

        this.sessions.set(sessionId, session);
        this.conversationToSessionId.set(conversationId, sessionId);
        this.sourceIdToSessionId.set(sourceId, sessionId);

        return session;
    }

    /**
     * Obtém uma sessão pelo ID.
     * 
     * @param {string} sessionId - ID da sessão
     * @returns {ChatwootSession | undefined} Sessão encontrada ou undefined
     */
    getSession(sessionId: string): ChatwootSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Obtém uma sessão pelo ID da conversa.
     * 
     * @param {number} conversationId - ID da conversa no Chatwoot
     * @returns {ChatwootSession | undefined} Sessão encontrada ou undefined
     */
    getSessionByConversationId(conversationId: number): ChatwootSession | undefined {
        const sessionId = this.conversationToSessionId.get(conversationId);
        if (sessionId) {
            return this.sessions.get(sessionId);
        }
        return undefined;
    }

    /**
     * Obtém uma sessão pelo sourceId (ID do WhatsApp).
     * 
     * @param {string} sourceId - ID do contato no WhatsApp
     * @returns {ChatwootSession | undefined} Sessão encontrada ou undefined
     */
    getSessionBySourceId(sourceId: string): ChatwootSession | undefined {
        const sessionId = this.sourceIdToSessionId.get(sourceId);
        if (sessionId) {
            return this.sessions.get(sessionId);
        }
        return undefined;
    }

    /**
     * Cria uma sessão a partir de um webhook do Chatwoot.
     * 
     * @param {any} webhookData - Dados do webhook do Chatwoot
     * @returns {ChatwootSession} Sessão da conversa
     */
    createSessionFromWebhook(webhookData: any): ChatwootSession {
        const conversation = webhookData.conversation || webhookData;
        const contact = conversation.meta?.sender || conversation.contact;
        const sourceId = contact?.source_id || conversation.source_id;
        const inboxId = conversation.inbox_id || webhookData.inbox?.id;
        
        return this.getOrCreateSession(
            conversation.id,
            contact?.id || conversation.contact_id,
            sourceId,
            inboxId
        );
    }

    /**
     * Marca uma sessão como inativa.
     * 
     * @param {string} sessionId - ID da sessão
     */
    deactivateSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.isActive = false;
        }
    }

    /**
     * Remove uma sessão.
     * 
     * @param {string} sessionId - ID da sessão
     */
    removeSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            this.conversationToSessionId.delete(session.conversationId);
            this.sourceIdToSessionId.delete(session.sourceId);
            this.sessions.delete(sessionId);
        }
    }

    /**
     * Lista todas as sessões ativas.
     * 
     * @returns {ChatwootSession[]} Lista de sessões ativas
     */
    getActiveSessions(): ChatwootSession[] {
        return Array.from(this.sessions.values()).filter(session => session.isActive);
    }

    /**
     * Limpa sessões inativas com mais de X minutos.
     * 
     * @param {number} minutesThreshold - Limite em minutos para considerar sessão inativa
     */
    cleanupInactiveSessions(minutesThreshold: number = 30): void {
        const now = new Date();
        const threshold = new Date(now.getTime() - minutesThreshold * 60 * 1000);

        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.lastActivity < threshold) {
                this.deactivateSession(sessionId);
            }
        }
    }

    /**
     * Obtém estatísticas das sessões.
     * 
     * @returns {object} Estatísticas das sessões
     */
    getStats(): { total: number; active: number; inactive: number } {
        const sessions = Array.from(this.sessions.values());
        return {
            total: sessions.length,
            active: sessions.filter(s => s.isActive).length,
            inactive: sessions.filter(s => !s.isActive).length
        };
    }
}
