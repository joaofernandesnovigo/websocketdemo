# Integração WAHA + Flowise + WhatsApp

Este documento explica como configurar a integração entre o WAHA, Flowise e WhatsApp para comunicação automatizada via IA.

## Configuração do WAHA

### 1. Acessar o Painel do WAHA
- Acesse: `http://54.242.89.184:3000/`
- Faça login no painel administrativo

### 2. Configurar Webhook
1. No painel do WAHA, vá para **Settings** ou **Configurações**
2. Localize a seção **Webhooks** ou **Integrações**
3. Adicione um novo webhook com as seguintes configurações:
   - **URL**: `http://seu-servidor.com/waha-webhook`
   - **Events**: Selecione `message` (não `message.received`)
   - **Method**: POST
   - **Headers**: `Content-Type: application/json`

**Nota**: O WAHA pode usar diferentes formatos de evento. Se `message.received` não estiver disponível, use apenas `message`.

### 3. Configurar Sessão do WhatsApp
1. No painel do WAHA, vá para **Sessions** ou **Sessões**
2. Crie uma nova sessão ou use uma existente
3. Anote o **Session ID** (será usado na configuração do ambiente)

## Configuração do Servidor

### 1. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Server Configuration
PORT=3000
HOST=127.0.0.1
SERVER_DEBUG=true

# WAHA Configuration
WAHA_BASE_URL=http://54.242.89.184:3000
WAHA_SESSION_ID=seu-session-id-aqui

# Flowise Configuration
IA_GATEWAY=http://seu-flowise-instance.com
CHATFLOW_ID=seu-chatflow-id-aqui

# AWS S3 Configuration (opcional, para uploads de mídia)
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=seu-bucket-name
```

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
2. **Webhook**: WAHA envia evento para `/waha-webhook`
3. **Processamento**: Servidor processa a mensagem e cria/recupera sessão
4. **IA**: Mensagem é enviada para o Flowise
5. **Resposta**: IA processa e retorna resposta
6. **Envio**: Resposta é enviada de volta para o WhatsApp via WAHA

### Separação de Conversas

- Cada número de telefone tem uma sessão única
- Sessões são identificadas pelo número do WhatsApp (formato: 5511999999999@c.us)
- O gerenciador de sessões mantém o estado de cada conversa
- Sessões inativas são limpas automaticamente a cada 30 minutos

## Endpoints Disponíveis

### Webhook do WAHA
- **POST** `/waha-webhook` - Recebe eventos do WAHA

### Monitoramento
- **GET** `/whatsapp-sessions` - Lista sessões ativas do WhatsApp
- **GET** `/health-check` - Verifica saúde do servidor

## Estrutura de Dados

### Evento do WAHA
```json
{
  "event": "message.received",
  "instance": "session-id",
  "data": {
    "id": "message-id",
    "from": "5511999999999@c.us",
    "to": "5511888888888@c.us",
    "body": "Texto da mensagem",
    "type": "text",
    "timestamp": 1234567890,
    "fromMe": false,
    "hasMedia": false
  }
}
```

### Sessão do WhatsApp
```json
{
  "id": "session-uuid",
  "phoneNumber": "5511999999999",
  "whatsappNumber": "5511999999999@c.us",
  "lastActivity": "2024-01-01T00:00:00.000Z",
  "isActive": true
}
```

## Logs e Monitoramento

O servidor gera logs detalhados para:
- Recebimento de webhooks do WAHA
- Processamento de mensagens
- Comunicação com o Flowise
- Envio de respostas para o WhatsApp
- Gerenciamento de sessões

## Troubleshooting

### Problemas Comuns

1. **Webhook não recebe eventos**
   - Verifique se a URL do webhook está correta
   - Confirme se o servidor está acessível publicamente
   - Verifique os logs do WAHA

2. **Erro de validação "body must have required property 'instance'"**
   - O WAHA pode estar enviando dados em formato diferente
   - Removemos a validação rígida para aceitar diferentes formatos
   - Verifique os logs para ver o formato real dos dados

3. **Mensagens não são processadas**
   - Verifique as variáveis de ambiente
   - Confirme se o Flowise está funcionando
   - Verifique os logs do servidor

4. **Respostas não chegam ao WhatsApp**
   - Verifique se o WAHA está conectado ao WhatsApp
   - Confirme se o Session ID está correto
   - Verifique os logs de envio

### Testando o Webhook

Use o endpoint de teste para verificar se o webhook está funcionando:

```bash
# Teste básico
curl -X POST http://localhost:3000/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Teste com dados do WAHA
curl -X POST http://localhost:3000/waha-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message",
    "instance": "default",
    "data": {
      "id": "test-123",
      "from": "5511999999999@c.us",
      "to": "5511888888888@c.us",
      "body": "Teste",
      "type": "text",
      "timestamp": 1234567890,
      "fromMe": false,
      "hasMedia": false
    }
  }'
```

### Logs Importantes

```bash
# Logs de webhook recebido
Received WAHA webhook event: message.received

# Logs de processamento
Processing message for session: session-id

# Logs de resposta do Flowise
Flowise response received: { responseText: "...", chatMessageId: "..." }

# Logs de envio para WhatsApp
Message sent to WhatsApp: { messageId: "...", to: "..." }
```

## Segurança

- Configure autenticação no webhook se necessário
- Use HTTPS em produção
- Monitore logs para atividades suspeitas
- Configure rate limiting se necessário

## Próximos Passos

- [ ] Implementar suporte a mensagens de mídia
- [ ] Adicionar autenticação ao webhook
- [ ] Implementar rate limiting
- [ ] Adicionar métricas e monitoramento
- [ ] Implementar retry para falhas de envio
