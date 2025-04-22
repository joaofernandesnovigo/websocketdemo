import { FastifyBaseLogger, FastifyInstance } from "fastify";
import { Server, Socket } from "socket.io";
import { v4 } from "uuid";
import axios from "axios";

import { CHAT_CHANNEL_DOMAIN, EVENTS } from "./constants";
import {
    ChatStateDTO,
    ContextSetterDTO,
    MessageActors,
    MessageContentChatState,
    MessageContentMediaLink,
    MessageStatus,
    MessageType,
    MiaChatState,
    MiaMessageDto,
    NewClientMessageDto,
    ServerMessageDto,
    StatusDTO,
} from "./types";
import { messageSender, getRoomMessages, MessageDbRow } from "./db/messages";
import { getInstanceByChatId, getInstanceById, InstanceDbRow } from "./db/bots";
import { getRoomPerson } from "./db/people";
import { mapMessageDTO } from "./utils";
import * as console from "node:console";
import { createChatCompletion } from "./serivces/openai";
import { sendMessage } from "./serivces/flowise/flowise";
import * as process from "node:process";

export class ChatService {
    server: FastifyInstance;

    log: FastifyBaseLogger;

    private openTickets: string[] = [];

    private _io?: Server;

    get io(): Server {
        if (!this._io) {
            throw Error("Socket IO is not defined");
        }
        return this._io;
    }

    set io(value: Server) {
        this._io = value;
    }

    constructor({ server }: { server: FastifyInstance }) {
        this.server = server;
        this.log = server.log;
    }

    connect() {
        const connectedServer = this.server as FastifyInstance & {
            io: Server;
        };
        if (!connectedServer.io) {
            throw Error("Cannot connect Socket IO");
        }
        this._io = connectedServer.io;

        this.io.on("connection", this.initSocket.bind(this));
    }

    async initSocket(socket: Socket) {
        this.log.info(`Socket #${socket.id} ${socket.recovered ? "re-" : ""}connected`);

        socket.on("disconnect", () => {
            this.log.info(`Socket #${socket.id} disconnected`);
        });

        const isInstanceValid = await this.initInstance(socket);
        if (!isInstanceValid) return;

        await this.initRoom(socket);

        await this.initConversation(socket);

        this.listenForClient(socket);

        this.listenForContext(socket);

        // this.listenForTranslation(socket);
    }

    async initInstance(socket: Socket) {
        socket.data.instance = await getInstanceByChatId(socket.handshake.auth.instance?.chatId || "");
        if (!socket.data.instance) {
            this.closeSocket(socket, "Chat Instance Error!");
            return;
        }
        if (!socket.data.instance.props.chat?.enabled) {
            this.closeSocket(socket, "Instance Chat Access Denied!");
            return false;
        }
        if (socket.handshake.auth.instance?.token !== socket.data.instance.props.chat?.clientToken) {
            this.closeSocket(socket, "Instance Access Denied!");
            return false;
        }
        return true;
    }

    async initRoom(socket: Socket) {
        const roomId = socket.handshake.auth.roomId || v4();
        this.log.info(`Init room ${roomId}`);

        socket.data.roomId = roomId;
        socket.join(roomId);
        socket.emit(EVENTS.EVENT_INIT_ROOM, {
            roomId,
            instance: {
                id: socket.data.instance.id,
                name: socket.data.instance.name,
            },
        });

        if (socket.handshake.auth.roomId) {
            socket.data.person = await getRoomPerson(roomId);
            if (socket.data.person) {
                this.sendPersonDataToClient(socket);
            }
        }
    }

    async initConversation(socket: Socket) {
        if (!socket.recovered) {
            const messages = await getRoomMessages(socket.data.roomId, socket.data.instance.id);
            this.log.info(`Sending initial messages: ${messages.length}`);

            const mappedMessages = messages.map(mapMessageDTO);
            this.log.info(mappedMessages)

            socket.emit(EVENTS.EVENT_SERVER_INIT_MESSAGE_LIST, messages.map(mapMessageDTO));
        }
    }

    listenForContext(socket: Socket) {
        this.log.info("Setting up context listener for socket");
        socket.on(EVENTS.EVENT_SET_CONTEXT, async ({ context }: ContextSetterDTO) => {
            try {
                sendMessage(socket.data.roomId, context ?? "Error fetching user context data.");
                const id = v4();
                const messageDbRow: MessageDbRow = {
                    id: id,
                    from: `${socket.data.roomId}@${CHAT_CHANNEL_DOMAIN} `,
                    to: socket.data.instance.props.chat.id,
                    content: context ?? "Error fetching user context data.",
                    metadata: {
                        "#uniqueId": id,
                    },
                    type: MessageType.Text,
                    actor: MessageActors.System,
                    createdAt: new Date().toISOString(),
                };
                messageSender(messageDbRow, socket.data.instance.props.chat.id, `${socket.data.roomId}@${CHAT_CHANNEL_DOMAIN}`)

            } catch (e) {
                this.log.error(`Send context to Mia error ${e}`);
                console.error(e);
            }
        });
    }

    listenForClient(socket: Socket) {
        this.log.info("Setting client listener for socket");
        socket.on(EVENTS.EVENT_CLIENT_SEND_MESSAGE, async ({ content, toLang, fromLang, agent }: NewClientMessageDto) => {
            const isAttendant = agent != undefined;
            const roomId: string = socket.data.roomId;

            if (isAttendant && !this.openTickets.includes(roomId)) {
                this.openTickets.push(roomId);
            }

            let translatedMessage = "";
            const needsTranslation = fromLang !== toLang && fromLang && toLang;

            if (needsTranslation) {
                translatedMessage = await this.translateMessage(content, toLang, fromLang);
            }

            const message: ServerMessageDto = {
                id: v4(),
                content: needsTranslation ? translatedMessage: content,
                from: socket.data.person?.name,
                createdAt: new Date().toISOString(),
                status: MessageStatus.Sent,
                direction: isAttendant ? "incoming" : "outgoing",
                metadata: {
                    originalMessage: content,
                },
                type: MessageType.Text,
            };

            this.log.info(`Processing message ${message.id} from room ${roomId}`);
            this.sendMessageToClient(roomId, message); // Client side sees sent message in its original state
            
            try {
                if (!isAttendant && !this.openTickets.includes(roomId)) {
                    this.log.info(`| ${process.env.IA_GATEWAY} | ${process.env.CHATFLOW_ID} |`);
                    const response = await sendMessage(socket.data.roomId, content);
                    this.log.info(`Send message ${response.data.text}`);
                    socket.emit(EVENTS.EVENT_SERVER_SEND_MESSAGE, {
                        id: response.data.chatMessageId,
                        content: response.data.text,
                        from: socket.data.instance.props.chat.id,
                        createdAt: "Hoje",
                        status: MessageStatus.Sent,
                    });
                    const answerDbRow: MessageDbRow = {
                        id: response.data.chatMessageId,
                        from: socket.data.instance.props.chat.id,
                        to: `${socket.data.roomId}@${CHAT_CHANNEL_DOMAIN} `,
                        content: response.data.text,
                        metadata: {
                            "#uniqueId": response.data.chatMessageId,
                        },
                        type: MessageType.Text,
                        actor: MessageActors.Assistant,
                        createdAt: new Date().toISOString(),
                    };
    
                    messageSender(answerDbRow, socket.data.instance.props.chat.id, `${socket.data.roomId}@${CHAT_CHANNEL_DOMAIN}`);
                }
    
                if (fromLang != toLang && fromLang && toLang) {
                    this.log.info(`Translating message from: ${fromLang} to: ${toLang}`);
                } else {
                    this.log.info("Same language");
                }
    
                
                const messageDbRow: MessageDbRow = {
                    id: message.id,
                    from: `${socket.data.roomId}${isAttendant ? `%40${CHAT_CHANNEL_DOMAIN}@desk.msging.net` : `@${CHAT_CHANNEL_DOMAIN}`}`,
                    to: socket.data.instance.props.chat.id,
                    content: needsTranslation ? translatedMessage: content,
                    type: message.type,
                    metadata:
                    {
                        "#uniqueId": message.id,
                        originalMessage: content,
                        fromLang,
                        toLang,
                        ...isAttendant ? { agent } : {},
                    },
                    actor: isAttendant ? MessageActors.Assistant : MessageActors.User,
                    createdAt: message.createdAt,
                };
                const sla = messageSender(messageDbRow, socket.data.instance.props.chat.id, `${socket.data.roomId}@${CHAT_CHANNEL_DOMAIN}`);
                this.log.info(sla)
            } catch (e) {
                this.log.error(`Send translating message to Mia error ${e}`);
                console.error(e);

                this.sendMessageStatusToClient(socket.data.roomId, {
                    messageId: message.id,
                    status: MessageStatus.Failed,
                });

                socket.emit(EVENTS.EVENT_SERVER_SEND_MESSAGE, {
                        id: response.data.chatMessageId,
                        content: await this.translateMessage("Houve um erro ao processar sua mensagem, por favor tente novamente. Caso o erro persista solicite transferência para o atendente.", fromLang, "PT-BR"); ,
                        from: socket.data.instance.props.chat.id,
                        createdAt: new Date().toISOString(),
                        status: MessageStatus.Sent,
                });
            }
        });
    }

    async translateMessage(content: string, toLang: string, fromLang: string) {
        this.log.info(`Translating message from ${fromLang} to ${toLang}`);
        const query = [{
            role: "user",
            content: `Translate the following text from ${fromLang} to ${toLang} directly just answer the response and NOTHING else. Message: ${content}`,
        }];
        try {
            const completion = await createChatCompletion({
                messages: query,
            });
            this.log.info({
                msg: "OpenAI response",
                response: completion.choices[0],
            });
            return completion.choices[0].message.content!;
        } catch (e) {
            console.log(`Translation Error: ${e}`);
            throw e;
        }
    }

    sendPersonDataToClient(socket: Socket) {
        this.log.info(`Sending person data to room ${socket.data.roomId}`);

        const { name, email, phoneNumber } = socket.data.person || {};
        this.io.to(socket.data.roomId).emit(EVENTS.EVENT_SERVER_SEND_USER_DATA, {
            name,
            email,
            phoneNumber,
        });
    }

    async getInstanceForSystemMessage(instanceId: number, systemToken: string) {
        const instance = await getInstanceById(instanceId);
        if (!instance) {
            throw Error("Instance Error!");
        }
        if (!instance.props.chat?.enabled) {
            throw Error("Instance Chat Access Denied!");
        }
        if (systemToken !== instance.props.chat?.systemToken) {
            throw Error("Instance Access Denied!");
        }
        return instance;
    }

    sendSystemMessage(instance: InstanceDbRow, { id, to, type, content }: MiaMessageDto) {
        const roomId = to.split("@")[0];
        switch (type) {
            case MessageType.Text: {
                this.sendMessageToClient(roomId, {
                    id,
                    content: content.toString(),
                    from: instance.name,
                    status: MessageStatus.Sent,
                    createdAt: new Date().toISOString(),
                    direction: "incoming",
                    type: MessageType.Text,
                });
                break;
            }
            case MessageType.MediaLink: {
                this.sendMessageToClient(roomId, {
                    id,
                    content: content as MessageContentMediaLink,
                    from: instance.name,
                    status: MessageStatus.Sent,
                    createdAt: new Date().toISOString(),
                    direction: "incoming",
                    type: MessageType.MediaLink,
                });
                break;
            }
            case MiaChatState.ChatState: {
                this.sendChatStateToClient(roomId, {
                    from: instance.name,
                    state: (content as MessageContentChatState).state,
                });
                break;
            }
            default: {
                throw Error("Unsupported message type!");
            }
        }
    }

    sendMessageToClient(roomId: string, message: ServerMessageDto) {
        this.log.info(`Sending message ${message.id} to client ${roomId}`);
        this.io.to(roomId).emit(EVENTS.EVENT_SERVER_SEND_MESSAGE, message);
    }

    sendChatStateToClient(roomId: string, state: ChatStateDTO) {
        this.io.to(roomId).emit(EVENTS.EVENT_SERVER_SEND_CHAT_STATE, state);
    }

    sendMessageStatusToClient(roomId: string, status: StatusDTO) {
        this.io.to(roomId).emit(EVENTS.EVENT_SERVER_SEND_MESSAGE_STATUS, status);
    }

    closeSocket(socket: Socket, message?: string) {
        if (message) socket.emit(EVENTS.EVENT_ERROR, { message });
        socket.disconnect(true);
    }
}
