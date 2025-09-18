import { createWahaAPI, sendWahaMessage, sendWahaMediaMessage } from "./api";
import { WahaSendMessageRequest, WahaSendMessageResponse } from "../../types";

/**
 * Serviço principal para comunicação com o WAHA.
 */
export class WahaService {
    private api: ReturnType<typeof createWahaAPI>;
    private sessionId: string;

    constructor(baseUrl: string, sessionId: string) {
        this.api = createWahaAPI(baseUrl);
        this.sessionId = sessionId;
    }

    /**
     * Envia uma mensagem de texto via WAHA.
     * 
     * @param {string} to - Número do destinatário (formato: 5511999999999@c.us)
     * @param {string} text - Texto da mensagem
     * @returns {Promise<WahaSendMessageResponse>} Resposta do WAHA
     */
    async sendTextMessage(to: string, text: string): Promise<WahaSendMessageResponse> {
        const messageData: WahaSendMessageRequest = {
            to,
            text,
            type: 'text'
        };

        return await sendWahaMessage(this.api, this.sessionId, messageData);
    }

    /**
     * Envia uma mensagem de mídia via WAHA.
     * 
     * @param {string} to - Número do destinatário (formato: 5511999999999@c.us)
     * @param {string} mediaUrl - URL da mídia
     * @param {string} caption - Legenda da mídia (opcional)
     * @param {string} type - Tipo da mídia (image, audio, video, document)
     * @returns {Promise<WahaSendMessageResponse>} Resposta do WAHA
     */
    async sendMediaMessage(
        to: string, 
        mediaUrl: string, 
        caption?: string, 
        type: 'image' | 'audio' | 'video' | 'document' = 'image'
    ): Promise<WahaSendMessageResponse> {
        const messageData: WahaSendMessageRequest = {
            to,
            media: {
                url: mediaUrl,
                caption
            },
            type
        };

        return await sendWahaMediaMessage(this.api, this.sessionId, messageData);
    }

    /**
     * Converte um número de telefone para o formato do WhatsApp.
     * 
     * @param {string} phoneNumber - Número de telefone (ex: 11999999999)
     * @returns {string} Número formatado para WhatsApp (ex: 5511999999999@c.us)
     */
    formatPhoneNumber(phoneNumber: string): string {
        // Remove todos os caracteres não numéricos
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Adiciona o código do país se não estiver presente
        let formattedNumber = cleanNumber;
        if (!cleanNumber.startsWith('55')) {
            formattedNumber = '55' + cleanNumber;
        }
        
        return `${formattedNumber}@c.us`;
    }

    /**
     * Extrai o número de telefone do formato do WhatsApp.
     * 
     * @param {string} whatsappNumber - Número no formato do WhatsApp (ex: 5511999999999@c.us)
     * @returns {string} Número de telefone limpo
     */
    extractPhoneNumber(whatsappNumber: string): string {
        return whatsappNumber.replace('@c.us', '');
    }
}
