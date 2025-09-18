const axios = require('axios');

// Teste do webhook
async function testWebhook() {
    try {
        console.log('Testing webhook...');
        
        // Dados de teste simulando o formato do WAHA
        const testData = {
            event: "message",
            instance: "default",
            data: {
                id: "test-message-123",
                from: "5511999999999@c.us",
                to: "5511888888888@c.us",
                body: "Olá, esta é uma mensagem de teste!",
                type: "text",
                timestamp: Date.now(),
                fromMe: false,
                hasMedia: false
            }
        };

        const response = await axios.post('http://localhost:3000/waha-webhook', testData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Webhook test successful:', response.data);
    } catch (error) {
        console.error('Webhook test failed:', error.response?.data || error.message);
    }
}

// Teste do endpoint de teste
async function testTestEndpoint() {
    try {
        console.log('Testing test endpoint...');
        
        const testData = {
            message: "Test message",
            timestamp: Date.now()
        };

        const response = await axios.post('http://localhost:3000/test-webhook', testData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Test endpoint successful:', response.data);
    } catch (error) {
        console.error('Test endpoint failed:', error.response?.data || error.message);
    }
}

// Executar testes
async function runTests() {
    console.log('=== Testing Webhook Integration ===\n');
    
    await testTestEndpoint();
    console.log('\n---\n');
    await testWebhook();
}

runTests();
