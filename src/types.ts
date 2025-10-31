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

// Chatwoot Types
export type ChatwootMessage = {
    id: number;
    content: string;
    message_type: "incoming" | "outgoing";
    created_at: number;
    private: boolean;
    source_id?: string;
    inbox_id?: number;
    conversation_id?: number;
    sender?: {
        id: number;
        name: string;
        email?: string;
    };
    attachments?: Array<{
        id: number;
        file_type: string;
        file_size: number;
        data_url: string;
    }>;
};

export type ChatwootWebhookEvent = {
    event: "message_created" | "message_updated" | "conversation_created" | "conversation_updated";
    timestamp: number;
    conversation?: {
        id: number;
        inbox_id: number;
        contact_id: number;
        source_id: string;
        status: string;
        meta?: {
            sender?: {
                id: number;
                source_id: string;
            };
        };
    };
    message?: ChatwootMessage;
    account?: {
        id: number;
    };
};

export type ChatwootSendMessageRequest = {
    content: string;
    message_type: "incoming" | "outgoing";
    private?: boolean;
};

export type ChatwootSendMessageResponse = {
    id: number;
    content: string;
    message_type: string;
    created_at: number;
    conversation_id: number;
    private: boolean;
};