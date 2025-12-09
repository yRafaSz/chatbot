exports.handler = async function(event, context) {
    // --- CABEÇALHOS ---
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    try {
        // !!! ATENÇÃO: ISSO É SÓ UM TESTE. DEPOIS VAMOS TIRAR DAQUI !!!
        const API_KEY = "AIzaSyD1vZIi6fD-lvEY7y5_hkrbeLMDFjiGqAo"; 
        
        // Validação básica
        if (API_KEY.includes("AIzaSyD1vZIi6fD-lvEY7y5_hkrbeLMDFjiGqAo")) {
             return { statusCode: 500, headers, body: JSON.stringify({ error: "Você esqueceu de colar a chave no código!" }) };
        }

        const body = JSON.parse(event.body || "{}");
        const { message, file, mimeType, isTitle } = body;

        // Monta o prompt
        const promptText = isTitle ? 
            `Resuma em 4 palavras: ${message}` : 
            `Você é o RafAI. Responda sobre saúde. Pergunta: ${message}`;

        const parts = [{ text: promptText }];
        
        if (file && !isTitle) {
            const base64Clean = file.includes('base64,') ? file.split('base64,')[1] : file;
            parts.push({ inlineData: { mimeType: mimeType, data: base64Clean } });
        }

        // --- USANDO O MODELO QUE FUNCIONA (SEM 'LATEST', SEM '2.0') ---
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        
        console.log("Tentando conectar com o Google...");

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const responseText = await response.text();
        console.log("Resposta do Google:", response.status);

        if (!response.ok) {
            return { 
                statusCode: response.status, 
                headers, 
                body: JSON.stringify({ error: `Erro Google (${response.status}): ${responseText}` }) 
            };
        }

        return { statusCode: 200, headers, body: responseText };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
