const axios = require('axios');

// Teste com a correção aplicada
async function testFixedSend() {
    try {
        console.log('Testing fixed WAHA send...');
        
        const wahaUrl = 'http://54.242.89.184:3000';
        const testData = {
            session: "default", // ✅ CORRETO - sempre "default"
            chatId: "5511949306089@c.us", // Número que enviou a mensagem
            text: "Teste com session 'default'!"
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
        
        console.log('✅ Success! Message sent:', response.data);
        
    } catch (error) {
        console.error('❌ Error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
    }
}

testFixedSend();
