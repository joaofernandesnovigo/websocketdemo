const axios = require('axios');

// Teste do webhook com diferentes formatos
async function testWebhookFormats() {
    const baseUrl = 'http://localhost:3000';
    
    console.log('=== Testing WAHA Webhook Formats ===\n');
    
    // Teste 1: Formato com event e data
    console.log('Test 1: Format with event and data');
    try {
        const testData1 = {
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

        const response1 = await axios.post(`${baseUrl}/waha-webhook`, testData1, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Success:', response1.data);
    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }
    
    console.log('\n---\n');
    
    // Teste 2: Formato direto (sem event/data wrapper)
    console.log('Test 2: Direct format (no event/data wrapper)');
    try {
        const testData2 = {
            id: "test-message-456",
            from: "5511999999999@c.us",
            to: "5511888888888@c.us",
            body: "Mensagem direta de teste!",
            type: "text",
            timestamp: Date.now(),
            fromMe: false,
            hasMedia: false
        };

        const response2 = await axios.post(`${baseUrl}/waha-webhook`, testData2, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Success:', response2.data);
    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }
    
    console.log('\n---\n');
    
    // Teste 3: Formato com event message.received
    console.log('Test 3: Format with event message.received');
    try {
        const testData3 = {
            event: "message.received",
            instance: "default",
            data: {
                id: "test-message-789",
                from: "5511999999999@c.us",
                to: "5511888888888@c.us",
                body: "Mensagem com event message.received!",
                type: "text",
                timestamp: Date.now(),
                fromMe: false,
                hasMedia: false
            }
        };

        const response3 = await axios.post(`${baseUrl}/waha-webhook`, testData3, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Success:', response3.data);
    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }
    
    console.log('\n---\n');
    
    // Teste 4: Verificar sessões ativas
    console.log('Test 4: Check active sessions');
    try {
        const response4 = await axios.get(`${baseUrl}/whatsapp-sessions`);
        console.log('✅ Active sessions:', response4.data);
    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }
}

// Executar testes
testWebhookFormats();
