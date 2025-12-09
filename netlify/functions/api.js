exports.handler = async function(event, context) {
    // 1. Configuração de CORS (Permite seu site falar com o servidor)
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    // 2. Responde a testes de conexão do navegador
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    try {
        // 3. Validação da Chave
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            console.error("ERRO: Chave API não encontrada.");
            return { statusCode: 500, headers, body: JSON.stringify({ error: "Chave API não configurada no painel do Netlify." }) };
        }

        // 4. TRATAMENTO DO CORPO DA MENSAGEM (AQUI ESTAVA O ERRO)
        let bodyText = event.body;
        
        // Se o corpo vier vazio, paramos aqui
        if (!bodyText) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "O corpo da requisição chegou vazio no servidor." }) };
        }

        // Se o Netlify codificou em Base64 (acontece com imagens), descodificamos
        if (event.isBase64Encoded) {
            bodyText = Buffer.from(event.body, 'base64').toString('utf8');
        }

        // Tentamos ler o JSON
        let body;
        try {
            body = JSON.parse(bodyText);
        } catch (e) {
            console.error("Erro ao ler JSON:", bodyText);
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Formato de dados inválido recebido pelo servidor." }) };
        }

        const { message, file, mimeType, isTitle } = body;

        // 5. Preparação para o Google
        let promptText = isTitle ? 
            `Analise: '${message}'. Crie um título com MAX 4 palavras.` : 
            `Você é o RafAI. Responda sobre saúde. Markdown. Pergunta: ${message}`;

        const parts = [{ text: promptText }];
        
        if (file && !isTitle) {
            // Remove o cabeçalho do base64 se existir (data:image/png;base64,...)
            const base64Clean = file.includes('base64,') ? file.split('base64,')[1] : file;
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        // 6. Chamada ao Google
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        // 7. Tratamento da Resposta do Google
        const responseText = await response.text();

        if (!response.ok) {
            console.error("Erro do Google:", responseText);
            return { 
                statusCode: response.status, 
                headers, 
                body: JSON.stringify({ error: `Google recusou (Erro ${response.status}): ${responseText}` }) 
            };
        }

        // Retorna sucesso
        return { statusCode: 200, headers, body: responseText };

    } catch (error) {
        console.error("Erro Crítico:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Erro interno: ${error.message}` }) };
    }
};
