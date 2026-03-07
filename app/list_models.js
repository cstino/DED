const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const keys = process.env.GOOGLE_GENERATIVE_AI_API_KEY.split(',').map(k => k.trim());
    const genAI = new GoogleGenerativeAI(keys[0]);
    
    try {
        // We use a lower level fetch or the SDK if possible to list models
        // The SDK doesn't have a direct listModels but we can try v1beta endpoint
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + keys[0]);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(error);
    }
}

listModels();
