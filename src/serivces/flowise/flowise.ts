import { createFlowiseAPI, FlowiseQuestionData, postFlowiseMessage } from "./api";

export const sendMessage = async (websocketId: string, message: string, conversation_id: number, account_id: number) => {
    const flowiseAPI = createFlowiseAPI();
    const messageData: FlowiseQuestionData = {
        question: message,
        overrideConfig: {
            sessionId: websocketId,
            vars: {
                sessionId: websocketId,
                conversationId: String(conversation_id),
                accountId: String(account_id),
            },
        },
    };

    return await postFlowiseMessage(flowiseAPI, messageData);
};

// (Faça o mesmo para a função sendContext se for usá-la)
export const sendContext = async (websocketId: string, message: string, conversation_id: number, account_id: number) => {
    const flowiseAPI = createFlowiseAPI();
    const messageData: FlowiseQuestionData = {
        question: message,
        overrideConfig: {
            sessionId: websocketId,
            vars: {
                sessionId: websocketId,
                conversationId: String(conversation_id),
                accountId: String(account_id),
            },
        },
    };

    return await postFlowiseMessage(flowiseAPI, messageData);
};