exports.handler = async function(event, context) {
    // 1. Configuração de Cabeçalhos (Igual ao PHP header)
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    // Responde ao 'pre-flight' do navegador
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: "Chave API não configurada." }) };
        }

        // 2. Tratamento do Corpo da Requisição
        // Proteção extra contra o erro "JSON Input"
        let bodyText = event.body;
        if (!bodyText) {
             return { statusCode: 400, headers, body: JSON.stringify({ error: "Corpo da mensagem vazio." }) };
        }
        
        if (event.isBase64Encoded) {
            bodyText = Buffer.from(event.body, 'base64').toString('utf8');
        }

        // Tenta ler o JSON com segurança
        let body;
        try {
            body = JSON.parse(bodyText);
        } catch (e) {
            console.error("Erro de Parse JSON:", bodyText);
            return { statusCode: 400, headers, body: JSON.stringify({ error: "O servidor recebeu dados inválidos (não é JSON)." }) };
        }

        const { message, file, mimeType, isTitle } = body;

        // 3. Prompt (Baseado na sua lógica do PDF)
        let promptText = isTitle ? 
            `Analise: '${message}'. Crie um título com MAX 4 palavras.` : 
            `Você é um assistente virtual que explica conceitos básicos de enfermagem com IoT. Fale sempre de forma simples. Mensagem: ${message}`;

        const parts = [{ text: promptText }];
        
        if (file && !isTitle) {
            const base64Clean = file.includes('base64,') ? file.split('base64,')[1] : file;
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        // 4. MODELO 2.0 (Igual ao seu PHP e ao erro de Cota que provou que ele existe)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const responseText = await response.text();

        if (!response.ok) {
            // Se der erro, mostra exatamente o que o Google respondeu
            return { 
                statusCode: response.status, 
                headers, 
                body: JSON.stringify({ error: `Google recusou (${response.status}): ${responseText}` }) 
            };
        }

        return { statusCode: 200, headers, body: responseText };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Erro interno: ${error.message}` }) };
    }
};
