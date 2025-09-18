const axios = require('axios');

// Teste de envio de mensagem via WAHA
async function testSendMessage() {
    try {
        console.log('Testing WAHA sendText API...');
        
        const wahaUrl = 'http://54.242.89.184:3000';
        const sessionId = 'default';
        const chatId = '5511949306089@c.us'; // Número que enviou a mensagem
        const text = 'Teste de envio de mensagem via API do WAHA!';
        
        console.log('Sending message:', {
            wahaUrl,
            sessionId,
            chatId,
            text
        });
        
        const response = await axios.post(`${wahaUrl}/api/sendText`, {
            session: sessionId,
            chatId: chatId,
            text: text
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Message sent successfully:', response.data);
        
    } catch (error) {
        console.error('❌ Error sending message:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
    }
}

// Teste do nosso webhook
async function testWebhook() {
    try {
        console.log('\nTesting our webhook...');
        
        const webhookData = {
            event: "message",
            session: "default",
            engine: "WEBJS",
            payload: {
                id: "test-message-123",
                timestamp: Math.floor(Date.now() / 1000),
                from: "5511949306089@c.us",
                fromMe: false,
                source: "app",
                to: "5511991896882@c.us",
                body: "Teste via webhook",
                hasMedia: false,
                ack: 1,
                vCards: []
            }
        };
        
        const response = await axios.post('http://localhost:3000/waha-webhook', webhookData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Webhook test successful:', response.data);
        
    } catch (error) {
        console.error('❌ Webhook test failed:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
    }
}

// Executar testes
async function runTests() {
    console.log('=== Testing WAHA Integration ===\n');
    
    await testSendMessage();
    console.log('\n---\n');
    await testWebhook();
}

runTests();
