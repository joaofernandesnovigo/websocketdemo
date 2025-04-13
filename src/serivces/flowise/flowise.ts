import { createFlowiseAPI, FlowiseQuestionData, postFlowiseMessage } from "./api";

/**
 * Envia uma mensagem para o serviço Flowise usando um ID de websocket como identificador de sessão.
 * 
 * @param {string} websocketId - O identificador único da sessão websocket
 * @param {string} message - A mensagem de texto a ser enviada para o Flowise
 * @returns {Promise<any>} A resposta do serviço Flowise após o processamento da mensagem
 */
export const sendMessage = async (websocketId: string, message: string) => {
    const flowiseAPI = createFlowiseAPI();
    const messageData: FlowiseQuestionData = {
        question: message,
        overrideConfig: {
            sessionId: websocketId,
        },
    };

    return await postFlowiseMessage(flowiseAPI, messageData);
};