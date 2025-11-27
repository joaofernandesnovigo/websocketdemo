import sql from "./db";

export type PersonDbRow = {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
};

interface Props {
    originalIdentifier: string;
    messagingIdentifier: string | undefined;
    originalPhoneNumber: null;
}

/**
 * Busca uma pessoa associada a um determinado ID de sala.
 * 
 * @param {string} roomId - O identificador da sala
 * @param {string} tenantId - O ID do tenant para filtrar
 * @returns {Promise<PersonDbRow|undefined>} A pessoa encontrada ou undefined se não existir
 */
export async function getRoomPerson (roomId: string, tenantId?: string) {
    return (await sql<PersonDbRow[]>`
        SELECT p.*
        FROM people p
            JOIN conversations c ON c.person_id = p.id
        WHERE c.props->'chat'->>'roomId' = ${roomId}
          ${tenantId ? sql`AND c.tenant_id = ${tenantId}` : sql``}
    `)[0];
}

/**
 * Busca uma pessoa existente pelo identificador ou cria uma nova se não existir.
 * 
 * @param {string} identifier - O identificador principal da pessoa
 * @param {string} name - O nome da pessoa
 * @param {string} [originalIdentifier] - O identificador original opcional
 * @param {string} [tenantId] - O ID do tenant para filtrar e associar
 * @returns {Promise<{id: string}>} O objeto contendo o ID da pessoa encontrada ou criada
 */
export async function findOrCreatePersonByIdentifier (
    identifier: string,
    name: string,
    originalIdentifier?: string,
    tenantId?: string,
) {
    const existingPerson = await sql<{ id: string }[]>`
        SELECT p.id
        FROM people p
        WHERE (
            p.props ->> 'messagingIdentifier' = ${identifier}
                OR (${originalIdentifier ?? null}::text IS NOT NULL AND p.props->>'originalIdentifier' = ${originalIdentifier ?? null}::text)
            )
          AND p.deleted_at IS NULL
          ${tenantId ? sql`AND p.tenant_id = ${tenantId}` : sql``}
        ORDER BY p.created_at DESC
    `.then(rows => rows[0]);

    if (existingPerson) {
        return existingPerson;
    }

    const props =  {
        originalIdentifier: identifier,
        messagingIdentifier: originalIdentifier,
        originalPhoneNumber: null,
    };

    return await sql<{ id: string }[]>`
        INSERT INTO people (name, props, tenant_id)
        VALUES (
            ${name},
            ${props as never}::jsonb,
            ${tenantId || null}
        )
        RETURNING id
    `.then(rows => rows[0]);
}

