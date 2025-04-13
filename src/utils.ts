import { MessageActors, MessageStatus, MessageType, ServerMessageDto } from "./types";
import { MessageDbRow, MessageMetadata } from "./db/messages";

/**
 * Determina o status de uma mensagem com base nos campos de entrega, leitura e metadados.
 * 
 * @param {Object} params - Objeto contendo os parâmetros necessários
 * @param {string|undefined} params.deliveredAt - Data/hora de entrega da mensagem
 * @param {string|undefined} params.readAt - Data/hora de leitura da mensagem
 * @param {Object} params.metadata - Metadados da mensagem
 * @returns {MessageStatus} O status atual da mensagem
 */
export const getStatusFromDbMessage = ({
    deliveredAt, readAt, metadata,
}: Pick<MessageDbRow, "deliveredAt" | "readAt" | "metadata">): MessageStatus => {
    if (readAt) return MessageStatus.Read;
    if (deliveredAt) return MessageStatus.Delivered;

    if (metadata.message_log_error) return MessageStatus.Failed;

    return MessageStatus.Sent;
};

/**
 * Extrai os metadados de uma mensagem do banco de dados.
 * 
 * @param {Object} metadata - Objeto contendo o campo de metadados
 * @returns {MessageMetadata} Os metadados da mensagem ou um objeto vazio
 */
export const getMessageMetadata = (metadata: Pick<MessageDbRow, "metadata" > ) =>{
    if (metadata)
        return metadata.metadata as MessageMetadata;
    return {};
};

/**
 * Mapeia o conteúdo da mensagem com base no tipo, convertendo para JSON quando necessário.
 * 
 * @param {string} content - O conteúdo da mensagem em formato string
 * @param {MessageType} type - O tipo da mensagem
 * @returns {string|Object} O conteúdo da mensagem, possivelmente convertido para objeto
 */
const mapMessageContent = (content: string, type: MessageType) => {
    if (type === MessageType.Text) return content;
    try {
        return JSON.parse(content);
    } catch (e) {
        return content;
    }
};

/**
 * Converte uma mensagem do formato do banco de dados para o formato DTO usado pelo servidor.
 * 
 * @param {MessageDbRow} message - A mensagem no formato do banco de dados
 * @returns {ServerMessageDto} A mensagem convertida para o formato DTO
 */
export const mapMessageDTO = ({ id, content, actor, createdAt, type, ...other }: MessageDbRow): ServerMessageDto => {
    const newMetadata = getMessageMetadata(other);
    return {
        id,
        content: mapMessageContent(content, type),
        from: actor,
        createdAt,
        status: getStatusFromDbMessage(other),
        direction: actor === MessageActors.User ? "outgoing" : "incoming",
        metadata: { ...newMetadata },
        type,
    };
};
