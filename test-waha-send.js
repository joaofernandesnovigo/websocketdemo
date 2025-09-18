const axios = require('axios');

// Teste de envio de mensagem via nosso endpoint
async function testWahaSend() {
    try {
        console.log('Testing WAHA send via our endpoint...');
        
        const testData = {
            chatId: "5511949306089@c.us", // Número que enviou a mensagem
            text: "Teste de envio via nosso endpoint!"
        };
        
        console.log('Sending test message:', testData);
        
        const response = await axios.post('http://localhost:3000/test-send-waha', testData, {
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

// Teste direto da API do WAHA
async function testDirectWaha() {
    try {
        console.log('\nTesting direct WAHA API...');
        
        const wahaUrl = 'http://54.242.89.184:3000';
        const testData = {
            session: "default",
            chatId: "5511949306089@c.us",
            text: "Teste direto da API do WAHA!"
        };
        
        console.log('Sending to WAHA:', {
            url: `${wahaUrl}/api/sendText`,
            data: testData
        });
        
        const response = await axios.post(`${wahaUrl}/api/sendText`, testData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Direct WAHA API success:', response.data);
        
    } catch (error) {
        console.error('❌ Direct WAHA API error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
    }
}

// Executar testes
async function runTests() {
    console.log('=== Testing WAHA Send Messages ===\n');
    
    await testWahaSend();
    console.log('\n---\n');
    await testDirectWaha();
}

runTests();
