exports.handler = async function(event, context) {
    // Cabeçalhos para o site aceitar a resposta
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    // Responde se o navegador estiver apenas testando a conexão
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    try {
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: "Chave API não configurada no Netlify." }) };
        }

        const body = JSON.parse(event.body);
        const { message, file, mimeType, isTitle } = body;

        let promptText = isTitle ? 
            `Analise: '${message}'. Crie um título com MAX 4 palavras.` : 
            `Você é o RafAI. Responda sobre saúde. Markdown. Pergunta: ${message}`;

        const parts = [{ text: promptText }];
        
        if (file && !isTitle) {
            const base64Clean = file.split(',')[1];
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        // Usamos o modelo 1.5 que é mais estável para contas grátis
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        // --- CORREÇÃO DO ERRO JSON ---
        // Lemos como texto primeiro. Se não for JSON, não quebra o site.
        const rawText = await response.text();

        if (!response.ok) {
            console.error("Erro do Google:", rawText);
            return { 
                statusCode: response.status, 
                headers, 
                body: JSON.stringify({ error: `Google recusou (Erro ${response.status}): ${rawText}` }) 
            };
        }

        try {
            // Tenta converter para JSON só se deu tudo certo
            const data = JSON.parse(rawText);
            return { statusCode: 200, headers, body: JSON.stringify(data) };
        } catch (e) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: "Google não retornou JSON válido." }) };
        }

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
