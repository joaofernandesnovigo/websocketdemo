const axios = require('axios');

// Teste simples para ver o formato dos dados
async function debugWebhook() {
    try {
        console.log('Testing webhook with minimal data...');
        
        // Teste com dados mínimos
        const testData = {
            id: "test-123",
            from: "5511999999999@c.us",
            to: "5511888888888@c.us",
            body: "Teste",
            type: "text",
            timestamp: Date.now(),
            fromMe: false,
            hasMedia: false
        };

        console.log('Sending data:', JSON.stringify(testData, null, 2));

        const response = await axios.post('http://localhost:3000/waha-webhook', testData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

debugWebhook();
