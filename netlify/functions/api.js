// api.js - Versão Compatível com GitHub/Netlify padrão
exports.handler = async function(event, context) {
    // 1. Pega a chave dos Segredos do Netlify
    const API_KEY = process.env.GEMINI_API_KEY;

    // 2. Configurações de segurança (CORS) para seu site aceitar a resposta
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    // 3. Responde a verificações do navegador (Pre-flight)
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    // 4. Validações básicas
    if (!API_KEY) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Chave de API não configurada no Netlify." }) };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: JSON.stringify({ error: "Método não permitido." }) };
    }

    try {
        // 5. Processa os dados enviados pelo seu site
        const body = JSON.parse(event.body);
        const { message, file, mimeType, isTitle } = body;

        // Monta o prompt
        let promptText = isTitle ? 
            `Analise: '${message}'. Crie um título com MAX 4 palavras. Responda APENAS o título.` : 
            `Você é o RafAI, um assistente especializado em Enfermagem e Fisioterapia.
            
            SUAS REGRAS DE CONDUTA:
            1. Responda a perguntas técnicas sobre saúde, anatomia e procedimentos.
            2. Se o assunto for fora de saúde (esporte, política, receitas), RECUSE educadamente.
            3. Seja cordial e profissional.
            
            Use Markdown. Pergunta do usuário: ${message}`;

        const parts = [{ text: promptText }];
        
        if (file && !isTitle) {
            const base64Clean = file.split(',')[1];
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        // 6. Chama o Google Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1betamodels/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const data = await response.json();

        // 7. Devolve a resposta para o seu site
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Erro na função:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || "Erro interno no servidor." })
        };
    }
};
