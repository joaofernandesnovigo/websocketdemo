const axios = require('axios');

// Debug para verificar exatamente o que está sendo enviado
async function debugSession() {
    try {
        console.log('Testing our endpoint to see what session is being used...');
        
        const testData = {
            chatId: "5511949306089@c.us",
            text: "Debug test message"
        };
        
        console.log('Sending to our endpoint:', testData);
        
        const response = await axios.post('http://localhost:3000/test-send-waha', testData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Our endpoint response:', response.data);
        
    } catch (error) {
        console.error('❌ Our endpoint error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
    }
}

debugSession();
