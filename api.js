export default async (req, context) => {
    // A chave fica segura nas variáveis do sistema do Netlify
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return new Response("Erro de configuração: API Key não encontrada no servidor.", { status: 500 });
    }

    // Apenas aceita método POST
    if (req.method !== "POST") {
        return new Response("Método não permitido", { status: 405 });
    }

    try {
        // Pega os dados que vieram do seu site
        const { message, file, mimeType, isTitle } = await req.json();

        // Monta o prompt igual você fazia no frontend
        let promptText = isTitle ? 
            `Analise: '${message}'. Crie um título com MAX 4 palavras. Responda APENAS o título.` : 
            `Você é o RafAI, um assistente especializado em Enfermagem e Fisioterapia.
            
            SUAS REGRAS DE CONDUTA:
            1. ACEITE cumprimentos básicos (Oi, Bom dia, Olá) de forma educada e breve, apresentando-se como especialista na área.
            2. Responda a perguntas técnicas sobre procedimentos clínicos, anatomia, reabilitação, medicamentos e diagnósticos.
            3. Se a pergunta for sobre assuntos totalmente fora do tema (ex: política, futebol, receitas culinárias, piadas), RECUSE-SE a responder educadamente dizendo que só fala de saúde.
            4. Se o usuário perguntar "Tudo bem?", responda brevemente e pergunte como pode ajudar na área da saúde.
            
            Use formatação Markdown.
            Pergunta do usuário: ${message}`;

        const parts = [{ text: promptText }];
        
        // Se tiver arquivo, adiciona
        if (file && !isTitle) {
            const base64Clean = file.split(',')[1];
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const data = await response.json();

        // Retorna a resposta do Google para o seu site
        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
