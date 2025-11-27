# Guia de Multi-Tenant

Esta aplicação agora suporta multi-tenant, permitindo que múltiplos clientes (tenants) compartilhem a mesma instância da aplicação com isolamento completo de dados.

## Conceitos

### Tenant
Um tenant representa um cliente ou organização que usa a aplicação. Cada tenant tem:
- Um ID único (UUID)
- Um slug único (usado para identificação via subdomain)
- Propriedades configuráveis (configurações de Chatwoot, Flowise, etc.)

### Isolamento de Dados
Todos os dados são isolados por tenant:
- **Bots**: Cada bot pertence a um tenant
- **People**: Cada pessoa pertence a um tenant
- **Conversations**: Cada conversa pertence a um tenant
- **Messages**: Cada mensagem pertence a um tenant
- **Files**: Cada arquivo pertence a um tenant

## Identificação do Tenant

A aplicação identifica o tenant através de três métodos (em ordem de prioridade):

1. **Header `X-Tenant-ID`**: UUID do tenant
2. **Header `X-Tenant-Slug`**: Slug do tenant
3. **Subdomain**: Extraído do header `Host` (ex: `tenant1.example.com` → `tenant1`)

### Exemplos

```bash
# Via header X-Tenant-ID
curl -H "X-Tenant-ID: 123e4567-e89b-12d3-a456-426614174000" http://localhost:3000/health-check

# Via header X-Tenant-Slug
curl -H "X-Tenant-Slug: tenant1" http://localhost:3000/health-check

# Via subdomain (requer configuração DNS)
curl http://tenant1.example.com:3000/health-check
```

## Configuração por Tenant

Cada tenant pode ter suas próprias configurações armazenadas no campo `props` da tabela `tenants`:

```json
{
  "chatwoot": {
    "baseUrl": "https://chatwoot.example.com",
    "accessToken": "token123",
    "accountId": 1
  },
  "flowise": {
    "baseUrl": "https://flowise.example.com",
    "apiKey": "key123",
    "chatflowId": "flow123"
  },
  "openai": {
    "apiKey": "sk-...",
    "model": "gpt-4"
  },
  "aws": {
    "region": "us-east-1",
    "bucket": "my-bucket",
    "accessKeyId": "AKIA...",
    "secretAccessKey": "..."
  }
}
```

## Migração do Banco de Dados

Execute a migração para adicionar suporte multi-tenant:

```bash
psql $DATABASE_URL -f migrations/001_add_tenant_support.sql
```

**Nota**: A migração adiciona colunas `tenant_id` em todas as tabelas, mas não migra dados existentes. Se você tem dados existentes, você precisará:

1. Criar um tenant padrão
2. Associar todos os registros existentes a esse tenant

## Criando um Tenant

### Via SQL

```sql
INSERT INTO tenants (name, slug, props)
VALUES (
  'Meu Tenant',
  'meu-tenant',
  '{
    "chatwoot": {
      "baseUrl": "https://chatwoot.example.com",
      "accessToken": "token123",
      "accountId": 1
    }
  }'::jsonb
);
```

### Via API (se implementado)

```bash
POST /api/tenants
{
  "name": "Meu Tenant",
  "slug": "meu-tenant",
  "props": {
    "chatwoot": {
      "baseUrl": "https://chatwoot.example.com",
      "accessToken": "token123",
      "accountId": 1
    }
  }
}
```

## WebSocket Connections

Para conexões WebSocket, o tenant pode ser identificado via:

1. **Handshake Auth**: `socket.handshake.auth.tenantId`
2. **Header**: `socket.handshake.headers["x-tenant-id"]`

Exemplo de conexão:

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    instance: {
      chatId: 'bot-id',
      token: 'client-token'
    },
    tenantId: '123e4567-e89b-12d3-a456-426614174000' // ou tenantSlug
  }
});
```

## Endpoints HTTP

Todos os endpoints HTTP agora suportam identificação de tenant via headers ou subdomain. O tenant context é automaticamente anexado ao `request.tenant`.

Exemplo:

```typescript
server.post("/my-endpoint", async function handler(request) {
  const tenantId = request.tenant?.tenantId;
  const tenantProps = request.tenant?.tenant?.props;
  
  // Use tenant-specific configuration
  const chatwootService = ChatwootService.fromTenantProps(tenantProps);
  // ...
});
```

## Webhooks

Para webhooks (como Chatwoot), o tenant pode ser identificado de várias formas:

1. **Header**: `X-Tenant-ID` ou `X-Tenant-Slug`
2. **Subdomain**: Se o webhook vier de um subdomain
3. **Account ID**: Pode ser mapeado para um tenant (requer implementação adicional)

## Segurança

- **Isolamento Garantido**: Todas as queries do banco de dados filtram por `tenant_id`
- **Validação**: O middleware valida se o tenant existe antes de processar requisições
- **Fallback**: Se nenhum tenant for identificado, a aplicação pode funcionar em modo "default" (compatibilidade retroativa)

## Compatibilidade Retroativa

A aplicação mantém compatibilidade com código existente:
- Se nenhum tenant for identificado, as queries funcionam sem filtro de tenant (para dados existentes)
- Variáveis de ambiente ainda funcionam como fallback para configurações

## Próximos Passos

1. **Migração de Dados**: Criar script para migrar dados existentes para tenants
2. **API de Gerenciamento**: Criar endpoints para CRUD de tenants
3. **Autenticação**: Implementar autenticação/autorização por tenant
4. **Métricas**: Adicionar métricas e logs por tenant
5. **Rate Limiting**: Implementar rate limiting por tenant

