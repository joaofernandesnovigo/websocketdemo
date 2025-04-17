import {MessageMetadata} from "./db/messages";

export enum MessageActors {
    User = "user",
    System = "system",
    Assistant = "assistant",
    Function = "function",
}

export enum MessageType {
    Text = "text/plain",
    MediaLink = "application/vnd.lime.media-link+json",
}

export enum MessageStatus {
    Sent = "sent",
    Delivered = "delivered",
    Read = "read",
    Failed = "failed",
}

export type BotProps = {

};

export type ServerMessageDto = {
    id: string;
    content: MessageContentType;
    from: string;
    status: MessageStatus;
    createdAt: string;
    direction: "outgoing" | "incoming";
    metadata?: MessageMetadata;
    type: MessageType;
};

export type StatusDTO = {
    messageId: string;
    status: MessageStatus;
};

export enum ChatState {
    Composing = "composing",
}

export type ChatStateDTO = {
    from: string;
    state: ChatState;
};

export type ClientMessageDto = {
    content: string;
};

export type NewClientMessageDto = {
    content: string;
    toLang?: string;
    fromLang?: string;
    agent?: {
        id: string;
        name: string;
    };
};

export type ContextSetterDTO = {
    context: string;
};

export type MessageContentMediaLink = {
    type?: string;
    uri?: string;
};
export type MessageContentChatState = { state: ChatState };
export type MessageContentType = string | MessageContentChatState | MessageContentMediaLink;

export enum MiaChatState {
    ChatState = "application/vnd.lime.chatstate+json",
}

export type MiaMessageDto = {
    id: string;
    type: MessageType | MiaChatState;
    content: MessageContentType;
    from: string;
    to: string;
};

export type MiaRequestParams = {
    instanceId: number;
};

export type Instance = {
    id: number;
    name: string;
};