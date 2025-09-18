import axios, { AxiosInstance } from "axios";
import { WahaSendMessageRequest, WahaSendMessageResponse } from "../../types";

/**
 * Cria e configura uma instância do Axios para comunicação com a API do WAHA.
 * 
 * @param baseUrl - URL base do WAHA (ex: http://54.242.89.184:3000)
 * @returns {AxiosInstance} Uma instância configurada do Axios para o WAHA
 */
export const createWahaAPI = (baseUrl: string): AxiosInstance => {
    const wahaAPI = axios.create({
        baseURL: baseUrl,
        headers: {
            "Content-Type": "application/json",
        },
    });

    return wahaAPI;
};

/**
 * Envia uma mensagem de texto via WAHA.
 * 
 * @param {AxiosInstance} instance - A instância do Axios configurada para o WAHA
 * @param {string} sessionId - ID da sessão do WhatsApp
 * @param {WahaSendMessageRequest} messageData - Dados da mensagem a ser enviada
 * @returns {Promise<WahaSendMessageResponse>} A resposta da API do WAHA
 */
export const sendWahaMessage = async (
    instance: AxiosInstance,
    sessionId: string,
    messageData: WahaSendMessageRequest
): Promise<WahaSendMessageResponse> => {
    const response = await instance.post<WahaSendMessageResponse>(
        `/api/sendText`,
        {
            session: sessionId,
            chatId: messageData.to,
            text: messageData.text
        }
    );
    return response.data;
};

/**
 * Envia uma mensagem de mídia via WAHA.
 * 
 * @param {AxiosInstance} instance - A instância do Axios configurada para o WAHA
 * @param {string} sessionId - ID da sessão do WhatsApp
 * @param {WahaSendMessageRequest} messageData - Dados da mensagem de mídia a ser enviada
 * @returns {Promise<WahaSendMessageResponse>} A resposta da API do WAHA
 */
export const sendWahaMediaMessage = async (
    instance: AxiosInstance,
    sessionId: string,
    messageData: WahaSendMessageRequest
): Promise<WahaSendMessageResponse> => {
    const response = await instance.post<WahaSendMessageResponse>(
        `/api/sessions/${sessionId}/messages/send`,
        messageData
    );
    return response.data;
};

/**
 * Obtém informações sobre uma sessão do WhatsApp.
 * 
 * @param {AxiosInstance} instance - A instância do Axios configurada para o WAHA
 * @param {string} sessionId - ID da sessão do WhatsApp
 * @returns {Promise<any>} Informações da sessão
 */
export const getWahaSession = async (
    instance: AxiosInstance,
    sessionId: string
): Promise<any> => {
    const response = await instance.get(`/api/sessions/${sessionId}`);
    return response.data;
};

/**
 * Lista todas as sessões disponíveis no WAHA.
 * 
 * @param {AxiosInstance} instance - A instância do Axios configurada para o WAHA
 * @returns {Promise<any[]>} Lista de sessões
 */
export const getWahaSessions = async (instance: AxiosInstance): Promise<any[]> => {
    const response = await instance.get("/api/sessions");
    return response.data;
};
