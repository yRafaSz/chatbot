exports.handler = async function(event, context) {
    // 1. Configuração de CORS (Cabeçalhos de Segurança)
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    // 2. Responde ao "pre-flight" do navegador
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    try {
        // 3. Validação da Chave
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: "Chave API não configurada no Netlify." }) };
        }

        // 4. Ler e Validar o Corpo da Mensagem
        let bodyText = event.body;
        if (!bodyText) return { statusCode: 400, headers, body: JSON.stringify({ error: "Corpo vazio." }) };
        
        if (event.isBase64Encoded) {
            bodyText = Buffer.from(event.body, 'base64').toString('utf8');
        }

        const body = JSON.parse(bodyText);
        const { message, file, mimeType, isTitle } = body;

        // 5. Montar o Prompt
        let promptText = isTitle ? 
            `Analise: '${message}'. Crie um título com MAX 4 palavras.` : 
            `Você é o RafAI. Responda sobre saúde. Markdown. Pergunta: ${message}`;

        const parts = [{ text: promptText }];
        
        if (file && !isTitle) {
            const base64Clean = file.includes('base64,') ? file.split('base64,')[1] : file;
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        // --- MUDANÇA AQUI: Usando o modelo 'latest' para garantir compatibilidade ---
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const responseText = await response.text();

        // 6. Tratamento de Erro do Google
        if (!response.ok) {
            console.error("Erro do Google:", responseText);
            // Se der erro de modelo não encontrado de novo, vamos tentar um fallback no futuro, 
            // mas agora vamos apenas mostrar o erro claro.
            return { 
                statusCode: response.status, 
                headers, 
                body: JSON.stringify({ error: `Google recusou (${response.status}): ${responseText}` }) 
            };
        }

        // 7. Sucesso!
        return { statusCode: 200, headers, body: responseText };

    } catch (error) {
        console.error("Erro Crítico:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Erro interno: ${error.message}` }) };
    }
};
