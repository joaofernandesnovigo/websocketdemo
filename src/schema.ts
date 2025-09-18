export const receiveMessageSchema = {
    headers: {
        type: "object",
        required: ["token"],
        properties: {
            token: { type: "string" },
        },
    },
    params: {
        type: "object",
        properties: {
            instanceId: { type: "number" },
        },
    },
    body: {
        type: "object",
        required: ["id", "content", "to"],
        properties: {
            id: { type: "string" },
            type: { type: "string" },
            content: {},
            from: { type: "string" },
            to: { type: "string" },
        },
    },
    response: {
        200: {
            type: "object",
            properties: {},
        },
    },
};

export const wahaWebhookSchema = {
    body: {
        type: "object",
        required: ["event", "instance", "data"],
        properties: {
            event: { 
                type: "string",
                enum: ["message.received", "message.sent", "message.updated", "message.deleted"]
            },
            instance: { type: "string" },
            data: {
                type: "object",
                required: ["id", "from", "to", "body", "type", "timestamp", "fromMe", "hasMedia"],
                properties: {
                    id: { type: "string" },
                    from: { type: "string" },
                    to: { type: "string" },
                    body: { type: "string" },
                    type: { 
                        type: "string",
                        enum: ["text", "image", "audio", "video", "document", "location", "contact", "sticker"]
                    },
                    timestamp: { type: "number" },
                    fromMe: { type: "boolean" },
                    hasMedia: { type: "boolean" },
                    mediaUrl: { type: "string" },
                    mediaMimeType: { type: "string" },
                    mediaFilename: { type: "string" },
                    caption: { type: "string" },
                    quotedMessageId: { type: "string" }
                }
            }
        },
    },
    response: {
        200: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                message: { type: "string" }
            },
        },
    },
};