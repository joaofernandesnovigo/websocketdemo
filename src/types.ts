import { MessageMetadata } from "./db/messages";

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

export type BotProps = {};

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
    title?: string;
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

export type NewImageDto = {
    data: string;
    fileName: string;
};

// WAHA Webhook Types
export type WahaMessage = {
    id: string;
    from: string;
    to: string;
    body: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact' | 'sticker';
    timestamp: number;
    fromMe: boolean;
    hasMedia: boolean;
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaFilename?: string;
    caption?: string;
    quotedMessageId?: string;
    contextInfo?: {
        quotedMessage?: WahaMessage;
    };
};

export type WahaWebhookEvent = {
    event: 'message.received' | 'message.sent' | 'message.updated' | 'message.deleted';
    instance: string;
    data: WahaMessage;
};

export type WahaSendMessageRequest = {
    to: string;
    text?: string;
    media?: {
        url: string;
        filename?: string;
        caption?: string;
    };
    type: 'text' | 'image' | 'audio' | 'video' | 'document';
};

export type WahaSendMessageResponse = {
    id: string;
    from: string;
    to: string;
    body: string;
    type: string;
    timestamp: number;
    fromMe: boolean;
    hasMedia: boolean;
};