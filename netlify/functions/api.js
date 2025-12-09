exports.handler = async function(event, context) {
    // 1. Configuração de Segurança (CORS)
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    // Responde testes do navegador
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    try {
        // 2. Validação da Chave
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: "Chave API não configurada no Netlify." }) };
        }

        // 3. Proteção contra erro de JSON vazio (Correção para o seu erro de log)
        if (!event.body) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "O corpo da mensagem chegou vazio." }) };
        }

        let bodyText = event.body;
        if (event.isBase64Encoded) {
            bodyText = Buffer.from(event.body, 'base64').toString('utf8');
        }

        // Tenta ler os dados com segurança
        let body;
        try {
            body = JSON.parse(bodyText);
        } catch (e) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Dados inválidos enviados pelo site." }) };
        }

        const { message, file, mimeType, isTitle } = body;

        // 4. Monta o texto para a IA
        let promptText = isTitle ? 
            `Analise: '${message}'. Crie um título com MAX 4 palavras.` : 
            `Você é o RafAI. Responda sobre saúde/enfermagem. Markdown. Pergunta: ${message}`;

        const parts = [{ text: promptText }];
        
        if (file && !isTitle) {
            const base64Clean = file.includes('base64,') ? file.split('base64,')[1] : file;
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        // 5. O MODELO CORRETO (Sem 'latest', sem 'pro', sem '2.0')
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const responseText = await response.text();

        // Se o Google der erro (ex: cota ou chave), repassa o erro exato
        if (!response.ok) {
            return { 
                statusCode: response.status, 
                headers, 
                body: JSON.stringify({ error: `Google Error (${response.status}): ${responseText}` }) 
            };
        }

        // Sucesso
        return { statusCode: 200, headers, body: responseText };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Erro interno: ${error.message}` }) };
    }
};
