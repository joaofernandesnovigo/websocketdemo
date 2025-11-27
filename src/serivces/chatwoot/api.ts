import axios, { AxiosInstance } from "axios";
import { ChatwootSendMessageRequest, ChatwootSendMessageResponse } from "../../types";
import FormData from 'form-data';
import { downloadCatalogFromS3, downloadEarMapFromS3, downloadLobuloplastia, downloadPortCursoInfan } from "../aws/s3";

/**
 * Cria e configura uma instância do Axios para comunicação com a API do Chatwoot.
 * 
 * @param baseUrl - URL base do Chatwoot (ex: http://localhost:3000)
 * @param accessToken - Token de acesso do Chatwoot (API Access Token)
 * @returns {AxiosInstance} Uma instância configurada do Axios para o Chatwoot
 */
export const createChatwootAPI = (baseUrl: string, accessToken: string): AxiosInstance => {
    const chatwootAPI = axios.create({
        baseURL: baseUrl,
        headers: {
            "Content-Type": "application/json",
            "api_access_token": accessToken
        },
    });

    return chatwootAPI;
};

/**
 * Envia uma mensagem de texto via Chatwoot API.
 * 
 * @param {AxiosInstance} instance - A instância do Axios configurada para o Chatwoot
 * @param {number} accountId - ID da conta no Chatwoot
 * @param {number} conversationId - ID da conversa
 * @param {ChatwootSendMessageRequest} messageData - Dados da mensagem a ser enviada
 * @returns {Promise<ChatwootSendMessageResponse>} A resposta da API do Chatwoot
 */
export const sendChatwootMessage = async (
    instance: AxiosInstance,
    accountId: number,
    conversationId: number,
    messageData: ChatwootSendMessageRequest
): Promise<ChatwootSendMessageResponse> => {
    const requestData = {
        content: messageData.content,
        message_type: "outgoing",
        private: false
    };
    
    console.log('Chatwoot API Request:', {
        url: `${instance.defaults.baseURL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
        headers: instance.defaults.headers,
        data: requestData
    });
    
    try {
        const response = await instance.post<ChatwootSendMessageResponse>(
            `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
            requestData
        );
        
        console.log('Chatwoot API Response Success:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data
        });
        
        return response.data;
    } catch (error: any) {
        console.log('Chatwoot API Response Error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers,
                data: error.config?.data
            }
        });
        
        throw error;
    }
};

/**
 * Obtém informações sobre uma conversa no Chatwoot.
 * 
 * @param {AxiosInstance} instance - A instância do Axios configurada para o Chatwoot
 * @param {number} accountId - ID da conta no Chatwoot
 * @param {number} conversationId - ID da conversa
 * @returns {Promise<any>} Informações da conversa
 */
export const getChatwootConversation = async (
    instance: AxiosInstance,
    accountId: number,
    conversationId: number
): Promise<any> => {
    const response = await instance.get(`/api/v1/accounts/${accountId}/conversations/${conversationId}`);
    return response.data;
};

/**
 * Lista todas as conversas de uma conta.
 * 
 * @param {AxiosInstance} instance - A instância do Axios configurada para o Chatwoot
 * @param {number} accountId - ID da conta no Chatwoot
 * @returns {Promise<any[]>} Lista de conversas
 */
export const getChatwootConversations = async (
    instance: AxiosInstance,
    accountId: number
): Promise<any[]> => {
    const response = await instance.get(`/api/v1/accounts/${accountId}/conversations`);
    return response.data;
};

export const sendCatalog = async (
    instance: AxiosInstance,
    accountId: number,
    conversationId: number,
): Promise<ChatwootSendMessageResponse> => {
    const form = await downloadCatalogFromS3();
    
    const response = await instance.post<ChatwootSendMessageResponse>(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, 
        form,
        {
            headers: {
                ...form.getHeaders()
            }
        }
    );
    
    return response.data;
}

export const sendEarMap = async (
    instance: AxiosInstance,
    accountId: number,
    conversationId: number,
): Promise<ChatwootSendMessageResponse> => {
    const form = await downloadEarMapFromS3();
    
    const response = await instance.post<ChatwootSendMessageResponse>(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, 
        form,
        {
            headers: {
                ...form.getHeaders()
            }
        }
    );
    
    return response.data;
}

export const sendPortCursoInfan = async (
    instance: AxiosInstance,
    accountId: number,
    conversationId: number,
): Promise<ChatwootSendMessageResponse> => {
    const form = await downloadPortCursoInfan();
    
    const response = await instance.post<ChatwootSendMessageResponse>(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, 
        form,
        {
            headers: {
                ...form.getHeaders()
            }
        }
    );
    
    return response.data;
}

export const sendLobuloplastia = async (
    instance: AxiosInstance,
    accountId: number,
    conversationId: number,
): Promise<ChatwootSendMessageResponse> => {
    const form = await downloadLobuloplastia();
    
    const response = await instance.post<ChatwootSendMessageResponse>(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, 
        form,
        {
            headers: {
                ...form.getHeaders()
            }
        }
    );
    
    return response.data;
}