import { v4 } from "uuid";
import { WahaMessage } from "../../types";

/**
 * Interface para uma sessão de conversa do WhatsApp.
 */
export interface WhatsAppSession {
    id: string;
    phoneNumber: string;
    whatsappNumber: string; // Formato: 5511999999999@c.us
    lastActivity: Date;
    isActive: boolean;
}

/**
 * Gerenciador de sessões para separar conversas do WhatsApp.
 */
export class WhatsAppSessionManager {
    private sessions: Map<string, WhatsAppSession> = new Map();
    private phoneToSessionId: Map<string, string> = new Map();

    /**
     * Cria ou recupera uma sessão para um número de telefone.
     * 
     * @param {string} whatsappNumber - Número no formato do WhatsApp (ex: 5511999999999@c.us)
     * @returns {WhatsAppSession} Sessão da conversa
     */
    getOrCreateSession(whatsappNumber: string): WhatsAppSession {
        const phoneNumber = whatsappNumber.replace('@c.us', '');
        
        // Verifica se já existe uma sessão para este número
        const existingSessionId = this.phoneToSessionId.get(phoneNumber);
        if (existingSessionId) {
            const session = this.sessions.get(existingSessionId);
            if (session) {
                // Atualiza a última atividade
                session.lastActivity = new Date();
                return session;
            }
        }

        // Cria uma nova sessão
        const sessionId = v4();
        const session: WhatsAppSession = {
            id: sessionId,
            phoneNumber,
            whatsappNumber,
            lastActivity: new Date(),
            isActive: true
        };

        this.sessions.set(sessionId, session);
        this.phoneToSessionId.set(phoneNumber, sessionId);

        return session;
    }

    /**
     * Obtém uma sessão pelo ID.
     * 
     * @param {string} sessionId - ID da sessão
     * @returns {WhatsAppSession | undefined} Sessão encontrada ou undefined
     */
    getSession(sessionId: string): WhatsAppSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Obtém uma sessão pelo número de telefone.
     * 
     * @param {string} phoneNumber - Número de telefone
     * @returns {WhatsAppSession | undefined} Sessão encontrada ou undefined
     */
    getSessionByPhone(phoneNumber: string): WhatsAppSession | undefined {
        const sessionId = this.phoneToSessionId.get(phoneNumber);
        if (sessionId) {
            return this.sessions.get(sessionId);
        }
        return undefined;
    }

    /**
     * Obtém uma sessão pelo número do WhatsApp.
     * 
     * @param {string} whatsappNumber - Número no formato do WhatsApp
     * @returns {WhatsAppSession | undefined} Sessão encontrada ou undefined
     */
    getSessionByWhatsAppNumber(whatsappNumber: string): WhatsAppSession | undefined {
        const phoneNumber = whatsappNumber.replace('@c.us', '');
        return this.getSessionByPhone(phoneNumber);
    }

    /**
     * Cria uma sessão a partir de uma mensagem do WAHA.
     * 
     * @param {any} message - Mensagem recebida do WAHA
     * @returns {WhatsAppSession} Sessão da conversa
     */
    createSessionFromMessage(message: any): WhatsAppSession {
        const whatsappNumber = message.fromMe ? message.to : message.from;
        return this.getOrCreateSession(whatsappNumber);
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
            this.phoneToSessionId.delete(session.phoneNumber);
            this.sessions.delete(sessionId);
        }
    }

    /**
     * Lista todas as sessões ativas.
     * 
     * @returns {WhatsAppSession[]} Lista de sessões ativas
     */
    getActiveSessions(): WhatsAppSession[] {
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
