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
 * @returns {AxiosInstance} Uma instância configurada do Axios para o Flowise
 */
export const createFlowiseAPI = () => {
    const flowiseAPI = axios.create({
        baseURL: process.env.IA_GATEWAY,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
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
 * @returns {Promise<{data: {text: string, chatMessageId: string, question: string, sessionId: string}}>} 
 *          A resposta da API contendo o texto da resposta e informações da sessão
 */
export const postFlowiseMessage = async (instance: AxiosInstance, data: FlowiseQuestionData) => {
    return instance.post<{
        text: string;
        chatMessageId: string;
        question: string;
        sessionId: string;
    }>(`/api/v1/prediction/${process.env.CHATFLOW_ID}`, data);
};