# Integração Chatwoot + Flowise + WhatsApp

Este documento explica como configurar a integração entre o Chatwoot (self-hosted), Flowise e WhatsApp para comunicação automatizada via IA.

## Configuração do Chatwoot

### 1. Instalação do Chatwoot Self-Hosted
- Siga a documentação oficial do Chatwoot para instalação self-hosted: https://www.chatwoot.com/docs/self-hosted
- Certifique-se de que o Chatwoot está rodando e acessível

### 2. Configuração da Integração WhatsApp
1. Acesse o painel do Chatwoot
2. Configure uma inbox do WhatsApp através das configurações de integrações
3. Certifique-se de que o WhatsApp está conectado e funcionando

### 3. Configurar Webhook no Chatwoot
1. No painel do Chatwoot, vá para **Settings** → **Integrations** → **Webhooks**
2. Clique em **Add New Webhook**
3. Configure o webhook com:
   - **URL**: `http://seu-servidor.com/chatwoot-webhook`
   - **Subscriptions**: Selecione `message_created` (evento quando uma nova mensagem é recebida)
   - **Method**: POST
   - **Headers**: `Content-Type: application/json`

### 4. Obter Token de Acesso da API
1. No Chatwoot, vá para o seu perfil
2. Role até o final da página
3. Copie o **API Access Token**
4. Anote o **Account ID** (geralmente visível na URL ou nas configurações da conta)

## Configuração do Servidor

### 1. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Server Configuration
PORT=3000
HOST=127.0.0.1
SERVER_DEBUG=true

# Chatwoot Configuration
CHATWOOT_BASE_URL=http://localhost:3000
CHATWOOT_ACCESS_TOKEN=seu-token-de-acesso-aqui
CHATWOOT_ACCOUNT_ID=1

# Flowise Configuration
IA_GATEWAY=http://seu-flowise-instance.com
CHATFLOW_ID=seu-chatflow-id-aqui

# AWS S3 Configuration (opcional, para uploads de mídia)
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=seu-bucket-name
```

**Importante:**
- `CHATWOOT_BASE_URL`: URL base da sua instância self-hosted do Chatwoot
- `CHATWOOT_ACCESS_TOKEN`: Token de acesso da API do Chatwoot (obtido no perfil)
- `CHATWOOT_ACCOUNT_ID`: ID da conta no Chatwoot (geralmente 1 para instalações padrão)

### 2. Instalar Dependências
```bash
yarn install
```

### 3. Compilar e Executar
```bash
# Compilar TypeScript
yarn build

# Executar em produção
yarn start

# Executar em desenvolvimento
yarn dev
```

## Como Funciona

### Fluxo de Mensagens

1. **Recebimento**: Usuário envia mensagem no WhatsApp
2. **Chatwoot**: Chatwoot recebe a mensagem via sua integração com WhatsApp
3. **Webhook**: Chatwoot envia evento `message_created` para `/chatwoot-webhook`
4. **Processamento**: Servidor processa a mensagem e cria/recupera sessão
5. **IA**: Mensagem é enviada para o Flowise
6. **Resposta**: IA processa e retorna resposta
7. **Envio**: Resposta é enviada de volta para o Chatwoot via API
8. **WhatsApp**: Chatwoot entrega a mensagem ao usuário via WhatsApp

### Separação de Conversas

- Cada conversa no Chatwoot tem um ID único
- Sessões são identificadas pelo `source_id` (número do WhatsApp) e `conversation_id`
- O gerenciador de sessões mantém o estado de cada conversa
- Sessões inativas são limpas automaticamente a cada 30 minutos

## Endpoints Disponíveis

### Webhook do Chatwoot
- **POST** `/chatwoot-webhook` - Recebe eventos do Chatwoot

### Monitoramento
- **GET** `/chatwoot-sessions` - Lista sessões ativas do Chatwoot
- **GET** `/health-check` - Verifica saúde do servidor

### Debug e Teste
- **POST** `/debug-chatwoot` - Captura dados do webhook para debug
- **POST** `/test-send-chatwoot` - Testa envio de mensagem via Chatwoot API

## Estrutura de Dados

### Evento do Webhook do Chatwoot
```json
{
  "event": "message_created",
  "timestamp": 1667561485,
  "message": {
    "id": 123,
    "content": "Texto da mensagem",
    "message_type": "incoming",
    "created_at": 1667561485,
    "conversation_id": 456,
    "private": false,
    "source_id": "5511999999999",
    "attachments": []
  },
  "conversation": {
    "id": 456,
    "inbox_id": 1,
    "contact_id": 789,
    "source_id": "5511999999999",
    "status": "open",
    "meta": {
      "sender": {
        "id": 789,
        "source_id": "5511999999999"
      }
    }
  },
  "account": {
    "id": 1
  }
}
```

### Sessão do Chatwoot
```json
{
  "id": "session-uuid",
  "conversationId": 456,
  "contactId": 789,
  "sourceId": "5511999999999",
  "inboxId": 1,
  "lastActivity": "2024-01-01T00:00:00.000Z",
  "isActive": true
}
```

## Logs e Monitoramento

O servidor gera logs detalhados para:
- Recebimento de webhooks do Chatwoot
- Processamento de mensagens
- Comunicação com o Flowise
- Envio de respostas para o Chatwoot
- Gerenciamento de sessões

## Troubleshooting

### Problemas Comuns

1. **Webhook não recebe eventos**
   - Verifique se a URL do webhook está correta no Chatwoot
   - Confirme se o servidor está acessível publicamente
   - Verifique se o evento `message_created` está selecionado nas subscriptions
   - Verifique os logs do Chatwoot

2. **Erro 401 (Unauthorized) ao enviar mensagem**
   - Verifique se o `CHATWOOT_ACCESS_TOKEN` está correto
   - Certifique-se de que o token não expirou
   - Verifique se o token tem permissões de escrita

3. **Erro 404 ao enviar mensagem**
   - Verifique se o `CHATWOOT_ACCOUNT_ID` está correto
   - Confirme se o `conversation_id` existe no Chatwoot
   - Verifique se a URL base do Chatwoot está correta

4. **Mensagens não são processadas**
   - Verifique as variáveis de ambiente
   - Confirme se o Flowise está funcionando
   - Verifique os logs do servidor
   - Certifique-se de que o evento do webhook está correto (`message_created`)

5. **Respostas não chegam ao WhatsApp**
   - Verifique se o Chatwoot está conectado ao WhatsApp
   - Confirme se as mensagens estão sendo enviadas via API
   - Verifique os logs de envio
   - Verifique se a conversa está ativa no Chatwoot

### Testando o Webhook

Use o endpoint de teste para verificar se o webhook está funcionando:

```bash
# Teste básico
curl -X POST http://localhost:3000/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Teste com dados do Chatwoot
curl -X POST http://localhost:3000/chatwoot-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_created",
    "timestamp": 1234567890,
    "message": {
      "id": 1,
      "content": "Teste",
      "message_type": "incoming",
      "created_at": 1234567890,
      "conversation_id": 1,
      "private": false
    },
    "conversation": {
      "id": 1,
      "inbox_id": 1,
      "contact_id": 1,
      "source_id": "5511999999999",
      "status": "open"
    },
    "account": {
      "id": 1
    }
  }'
```

### Testando o Envio de Mensagem

```bash
# Teste de envio via API do Chatwoot
curl -X POST http://localhost:3000/test-send-chatwoot \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": 1,
    "text": "Mensagem de teste"
  }'
```

### Logs Importantes

```bash
# Logs de webhook recebido
Chatwoot webhook received: { event: "message_created", ... }

# Logs de processamento
Processing message for session: session-id

# Logs de resposta do Flowise
Flowise response received: { responseText: "...", chatMessageId: "..." }

# Logs de envio para Chatwoot
Message sent to Chatwoot successfully: { messageId: ..., conversationId: ... }
```

## Diferenças entre WAHA e Chatwoot

### Estrutura de Dados
- **WAHA**: Usa formato de mensagem com `from`, `to`, `body`
- **Chatwoot**: Usa `conversation_id`, `message_type`, `content`

### Identificação de Sessões
- **WAHA**: Identifica por número do WhatsApp (`5511999999999@c.us`)
- **Chatwoot**: Identifica por `conversation_id` e `source_id`

### Envio de Mensagens
- **WAHA**: Envia diretamente para o número do WhatsApp
- **Chatwoot**: Envia para uma conversa específica via `conversation_id`

## Segurança

- Configure autenticação no webhook se necessário (adicionar validação de token)
- Use HTTPS em produção
- Monitore logs para atividades suspeitas
- Configure rate limiting se necessário
- Mantenha o `CHATWOOT_ACCESS_TOKEN` seguro e não o exponha

## Próximos Passos

- [ ] Implementar suporte a mensagens de mídia/anexos
- [ ] Adicionar autenticação ao webhook
- [ ] Implementar rate limiting
- [ ] Adicionar métricas e monitoramento
- [ ] Implementar retry para falhas de envio
- [ ] Suportar múltiplas contas do Chatwoot
