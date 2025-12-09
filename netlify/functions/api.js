exports.handler = async function(event, context) {
    const API_KEY = process.env.GEMINI_API_KEY;

    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    if (!API_KEY) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Chave API não configurada" }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { message, file, mimeType, isTitle } = body;

        let promptText = isTitle ? 
            `Analise: '${message}'. Crie um título com MAX 4 palavras. Responda APENAS o título.` : 
            `Você é o RafAI, assistente de Enfermagem/IoT. Responda tecnicamente sobre saúde. Markdown. Pergunta: ${message}`;

        const parts = [{ text: promptText }];
        
        if (file && !isTitle) {
            const base64Clean = file.split(',')[1];
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const data = await response.json();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
