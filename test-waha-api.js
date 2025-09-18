const axios = require('axios');

// Teste simples para verificar se a API do WAHA está funcionando
async function testWahaAPI() {
    try {
        console.log('Testing WAHA API access...');
        
        const wahaUrl = 'http://54.242.89.184:3000';
        
        // Teste 1: Verificar se a API está online
        console.log('\n1. Testing API health...');
        try {
            const healthResponse = await axios.get(`${wahaUrl}/api/health`);
            console.log('✅ WAHA API is online:', healthResponse.data);
        } catch (error) {
            console.log('❌ Health check failed:', error.message);
        }
        
        // Teste 2: Listar sessões
        console.log('\n2. Testing sessions list...');
        try {
            const sessionsResponse = await axios.get(`${wahaUrl}/api/sessions`);
            console.log('✅ Sessions:', sessionsResponse.data);
        } catch (error) {
            console.log('❌ Sessions check failed:', error.message);
        }
        
        // Teste 3: Tentar enviar mensagem
        console.log('\n3. Testing send message...');
        try {
            const sendResponse = await axios.post(`${wahaUrl}/api/sendText`, {
                session: "default",
                chatId: "5511949306089@c.us",
                text: "Teste da API do WAHA!"
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Message sent:', sendResponse.data);
        } catch (error) {
            console.log('❌ Send message failed:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
        }
        
    } catch (error) {
        console.error('❌ General error:', error.message);
    }
}

testWahaAPI();
