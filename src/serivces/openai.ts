import axios from "axios";

const REQUEST_TIMEOUT_SECONDS = 60;
export const DEFAULT_TEMPERATURE = 0.3;

export type OpenAiMessage = {
    role: string;
    content: string;
};

type CreateChatCompletionParams = {
    messages: OpenAiMessage[];
    temperature?: number;
    model?: string;
};

export type OpenAiCompletion = {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: OpenAiMessage;
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
};

export const gpt4oConfig = {
    modelName: process.env.AOAI_DEPLOYMENT_NAME,
    resourceName: process.env.AOAI_RESOURCE_NAME || "",
    apiVersion: process.env.AOAI_API_VERSION || "",
    apiKey: process.env.AOAI_API_KEY || "",
};

export const azureOpenAi = () => {
    const modelConfig =  gpt4oConfig;
    return axios.create({
        baseURL: `https://${modelConfig.resourceName}.openai.azure.com/openai/deployments`,
        headers: {
            "Content-Type": "application/json",
            "api-key": modelConfig.apiKey,
        },
        params: {
            "api-version": modelConfig.apiVersion,
        },
        timeout: REQUEST_TIMEOUT_SECONDS * 1000,
    });
};

export const createChatCompletion = async ({
    messages,
    temperature = DEFAULT_TEMPERATURE,
    model = process.env.AOAI_DEPLOYMENT_NAME,
}: CreateChatCompletionParams) => {
    try {
        const payload = {
            messages,
            model,
            temperature,
        };

        const { data: response } = await azureOpenAi()
            .post<OpenAiCompletion>(`/${model}/chat/completions`, payload);

        return response;
    } catch (e) {
        console.log(`Completion Error: ${e}`);
        throw e;
    }
};