import sql from "./db";

export type InstanceDbRow = {
    id: number;
    name: string;
    props: {
        chat?: {
            id?: string;
            enabled?: boolean;
            clientToken?: string;
            systemToken?: string;
        };
    };
};

/**
 * Busca uma instância de bot pelo ID do chat.
 * 
 * @param {string} id - O ID do chat para buscar a instância correspondente
 * @returns {Promise<InstanceDbRow|undefined>} A instância encontrada ou undefined se não existir
 */
export async function getInstanceByChatId (id: string) {
    if (!id) return undefined;
    return (await sql<InstanceDbRow[]>`
        SELECT b.*
        FROM bots b
        WHERE b.props->'chat'->>'id' = ${id} 
        LIMIT 1
    `)[0];
}

/**
 * Busca uma instância de bot pelo seu ID numérico.
 * 
 * @param {number} id - O ID numérico do bot para buscar
 * @returns {Promise<InstanceDbRow|undefined>} A instância encontrada ou undefined se não existir
 */
export async function getInstanceById (id: number) {
    return (await sql<InstanceDbRow[]>`
        SELECT b.*
        FROM bots b
        WHERE b.id = ${id} 
        LIMIT 1
    `)[0];
}
