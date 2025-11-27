import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

export interface FlowiseQuestionData {
    question: string;
    overrideConfig: {
        sessionId: string;
        vars: Record<string, string>;
    };
}

/**
 * Cria e configura uma instância do Axios para comunicação com a API do Flowise.
 * 
 * @param baseUrl - URL base do Flowise (opcional, usa env var se não fornecido)
 * @param apiKey - API Key do Flowise (opcional)
 * @returns {AxiosInstance} Uma instância configurada do Axios para o Flowise
 */
export const createFlowiseAPI = (baseUrl?: string, apiKey?: string) => {
    const flowiseAPI = axios.create({
        baseURL: baseUrl || process.env.IA_GATEWAY,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...(apiKey && { "Authorization": `Bearer ${apiKey}` }),
        },
    });

    flowiseAPI.interceptors.request.use((config: InternalAxiosRequestConfig<any>) => {
        config.data = config.data || {};
        config.params = config.params || {};

        config.data.languageCode = "pt-BR";
        config.data.regionCode = "br";
        return config;
    });

    flowiseAPI.interceptors.response.use((response) => {
        return response;
    });

    return flowiseAPI;
};

/**
 * Envia uma mensagem para o endpoint de predição do Flowise.
 * 
 * @param {AxiosInstance} instance - A instância do Axios configurada para o Flowise
 * @param {FlowiseQuestionData} data - Os dados da pergunta a serem enviados
 * @param {string} chatflowId - ID do chatflow (opcional, usa env var se não fornecido)
 * @returns {Promise<{data: {text: string, chatMessageId: string, question: string, sessionId: string}}>} 
 *          A resposta da API contendo o texto da resposta e informações da sessão
 */
export const postFlowiseMessage = async (instance: AxiosInstance, data: FlowiseQuestionData, chatflowId?: string) => {
    const flowId = chatflowId || process.env.CHATFLOW_ID;
    if (!flowId) {
        throw new Error("Chatflow ID is required");
    }
    return instance.post<{
        text: string;
        chatMessageId: string;
        question: string;
        sessionId: string;
    }>(`/api/v1/prediction/${flowId}`, data);
};