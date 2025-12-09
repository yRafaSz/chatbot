exports.handler = async function(event, context) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: "Chave API não configurada." }) };
        }

        let bodyText = event.body;
        if (event.isBase64Encoded) {
            bodyText = Buffer.from(event.body, 'base64').toString('utf8');
        }
        const body = JSON.parse(bodyText || "{}");
        const { message, file, mimeType, isTitle } = body;

        // Prompt
        let promptText = isTitle ? 
            `Analise: '${message}'. Crie um título com MAX 4 palavras.` : 
            `Você é o RafAI. Responda sobre saúde/enfermagem. Markdown. Pergunta: ${message}`;

        const parts = [{ text: promptText }];
        
        if (file && !isTitle) {
            const base64Clean = file.includes('base64,') ? file.split('base64,')[1] : file;
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        // --- MUDANÇA CRUCIAL: USANDO O MODELO 'gemini-pro' (MAIS ESTÁVEL) ---
        // Se este falhar, trocaremos para 'gemini-1.5-flash' novamente, mas testemos este.
        const modelVersion = file ? "gemini-1.5-flash" : "gemini-pro"; 
        // Nota: gemini-pro não aceita imagens antigamente, então usamos flash se tiver imagem.
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelVersion}:generateContent?key=${API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const responseText = await response.text();

        if (!response.ok) {
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
