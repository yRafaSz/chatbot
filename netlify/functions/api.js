exports.handler = async function(event, context) {
    // Cabeçalhos para permitir acesso do seu site
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    // Responde ao teste do navegador
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        
        // Validação extra da chave
        if (!API_KEY) {
            console.error("ERRO: Chave API não encontrada no servidor");
            return { statusCode: 500, headers, body: JSON.stringify({ error: "Chave API não configurada no Netlify." }) };
        }

        const body = JSON.parse(event.body);
        const { message, file, mimeType, isTitle } = body;

        let promptText = isTitle ? 
            `Analise: '${message}'. Crie um título com MAX 4 palavras. Responda APENAS o título.` : 
            `Você é o RafAI. Responda sobre saúde/enfermagem. Markdown. Pergunta: ${message}`;

        const parts = [{ text: promptText }];
        
        if (file && !isTitle) {
            const base64Clean = file.split(',')[1];
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        // --- MUDANÇA IMPORTANTE AQUI ---
        // Usamos o modelo 1.5 que é mais estável para contas gratuitas
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        // Lemos o texto bruto primeiro para não travar o servidor
        const rawText = await response.text();

        // Se o Google reclamar (ex: erro 400, 429, 500), devolvemos o erro visível
        if (!response.ok) {
            console.error("Erro do Google:", rawText);
            return { 
                statusCode: response.status, 
                headers, 
                body: JSON.stringify({ error: `Google Error (${response.status}): ${rawText}` }) 
            };
        }

        // Se deu certo, tentamos converter para JSON
        try {
            const data = JSON.parse(rawText);
            return { statusCode: 200, headers, body: JSON.stringify(data) };
        } catch (jsonError) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: "Google retornou dados inválidos: " + rawText }) };
        }

    } catch (error) {
        console.error("Erro Geral:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
