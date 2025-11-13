// flowise.ts (Editado)

import { createFlowiseAPI, FlowiseQuestionData, postFlowiseMessage } from "./api";

/**
 * Envia uma mensagem para o Flowise formatada como um JSON (para o Tool Agent).
 * Isso permite que o agente extraia 'userInput', 'accountId' e 'conversationId'.
 * * @param {string} websocketId - O identificador único da sessão (sessionId)
 * @param {string} message - A mensagem de texto do usuário
 * @param {number} conversation_id - O ID da conversa do Chatwoot
 * @param {number} account_id - O ID da conta do Chatwoot
 * @returns {Promise<any>} A resposta do serviço Flowise
 */
export const sendMessage = async (websocketId: string, message: string, conversation_id: number, account_id: number) => {
    const flowiseAPI = createFlowiseAPI();

    // 1. Criamos um objeto com a mensagem e o contexto
    const questionObject = {
        userInput: message,
        accountId: "1",
        conversationId: String(conversation_id)
    };

    const messageData: FlowiseQuestionData = {
        // 2. A "pergunta" é o JSON stringificado
        question: JSON.stringify(questionObject),
        
        overrideConfig: {
            sessionId: websocketId,
            vars: { 
                sessionId: websocketId,
            },
        },
    };

    return await postFlowiseMessage(flowiseAPI, messageData);
};

/**
 * Envia uma mensagem de texto simples para o Flowise (lógica original).
 * Esta função NÃO envia o accountId ou conversationId para o Agente.
 * * @param {string} websocketId - O identificador único da sessão (sessionId)
 * @param {string} message - A mensagem de texto a ser enviada
 * @returns {Promise<any>} A resposta do serviço Flowise
 */
export const sendContext = async (websocketId: string, message: string) => {
    const flowiseAPI = createFlowiseAPI();
    const messageData: FlowiseQuestionData = {
        // A pergunta é apenas a string da mensagem
        question: message,
        overrideConfig: {
            sessionId: websocketId,
            vars: {
                sessionId: websocketId,
            },
        },
    };

    return await postFlowiseMessage(flowiseAPI, messageData);
};