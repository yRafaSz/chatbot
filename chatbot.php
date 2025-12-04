<?php
// -------------------------------------------------------------------------
// PARTE 1: BACKEND (PHP)
// -------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header("Content-Type: application/json");

    // Recebe os dados
    $acao = $_POST['acao'] ?? 'chat'; // Define se é chat normal ou gerar título
    $mensagem = $_POST["mensagem"] ?? "";
    $imagemBase64 = $_POST["imagem"] ?? "";
    $mimeType = $_POST["mimeType"] ?? "";

    // ⬇️⬇️⬇️ SUA CHAVE API ⬇️⬇️⬇️
    $api_key = "AIzaSyCn6lK1aykDWPhOkF9q6kv5wf7PpmXilIk"; 
    // ⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️⬆️

    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . $api_key;

    // --- LÓGICA 1: GERAR TÍTULO INTELIGENTE ---
    if ($acao === 'gerar_titulo') {
        $prompt_titulo = "
        Analise a seguinte primeira mensagem de um usuário em um chat sobre Enfermagem/IoT: '$mensagem'.
        Crie um título curtíssimo (máximo 4 palavras) que resuma o TEMA CENTRAL.
        Exemplo: 'Sensores em UTI', 'Monitoramento Cardíaco', 'Dúvida sobre Arduino'.
        Responda APENAS o título, sem aspas e sem enrolação.
        ";
        
        $data = ["contents" => [["parts" => [["text" => $prompt_titulo]]]]];
    } 
    
    // --- LÓGICA 2: CHAT NORMAL ---
    else {
        $prompt_sistema = "
        Você é um assistente virtual especialista em Enfermagem e IoT.
        DIRETRIZES:
        1. Analise imagens com foco clínico/técnico.
        2. Seja didático e cordial.
        3. SEGURANÇA: Se o usuário digitar apenas caracteres aleatórios (ex: '123', 'asdf') ou frases sem contexto,
           responda APENAS: 'Desculpe, não consegui entender o contexto. Poderia reformular sua dúvida sobre Enfermagem ou IoT?'
        
        Mensagem do usuário: $mensagem
        ";

        $parts = [["text" => $prompt_sistema]];

        if (!empty($imagemBase64)) {
            $imagemLimpa = preg_replace('#^data:image/\w+;base64,#i', '', $imagemBase64);
            $parts[] = [
                "inlineData" => [
                    "mimeType" => $mimeType,
                    "data"     => $imagemLimpa
                ]
            ];
        }
        $data = ["contents" => [["parts" => $parts]]];
    }

    // --- ENVIO CURL (COMUM PARA OS DOIS) ---
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    
    if(curl_errno($ch)) {
        echo json_encode(["resposta" => "Erro de conexão."]); exit;
    }
    curl_close($ch);

    $json = json_decode($response, true);
    $resposta = $json["candidates"][0]["content"]["parts"][0]["text"] 
        ?? "Erro na API.";

    // Se for título, limpa quebras de linha
    if ($acao === 'gerar_titulo') {
        $resposta = trim(str_replace(["\n", "\r", "*"], "", $resposta));
    }

    echo json_encode(["resposta" => $resposta]);
    exit;
}
?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RafAI - IoT Network</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --primary: #007AFF; 
            --bg-base: #0f172a;
            --glass-bg: rgba(20, 25, 40, 0.75); 
            --glass-border: rgba(255, 255, 255, 0.1);
            --text-color: #e2e8f0;
            --sidebar-width: 260px;
        }
        
        body { font-family: 'Inter', sans-serif; background-color: var(--bg-base); margin: 0; height: 100vh; display: flex; justify-content: center; align-items: center; color: var(--text-color); overflow: hidden; position: relative; }
        #bg-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }

        .main-wrapper {
            position: relative; z-index: 1; display: flex; width: 95%; max-width: 1200px; height: 90vh;
            background: var(--glass-bg); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            border: 1px solid var(--glass-border); border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6); overflow: hidden;
        }

        /* SIDEBAR */
        .sidebar { width: var(--sidebar-width); background: rgba(0, 0, 0, 0.3); border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; padding: 20px; }
        .new-chat-btn {
            background: linear-gradient(90deg, #007AFF, #00C6FF); color: white; border: none; padding: 15px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.3s; margin-bottom: 25px; width: 100%; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.85rem; box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
        }
        .new-chat-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 122, 255, 0.5); filter: brightness(1.1); }

        .history-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .history-list::-webkit-scrollbar { width: 4px; } .history-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
        .history-item { padding: 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; color: rgba(255,255,255,0.7); transition: 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; justify-content: space-between; align-items: center; border: 1px solid transparent; }
        .history-item:hover { background: rgba(255,255,255,0.05); color: white; border-color: rgba(255,255,255,0.1); }
        .history-item.active { background: rgba(255,255,255,0.1); color: white; border-color: var(--primary); }
        .delete-chat { font-size: 0.8rem; opacity: 0; color: #ff4d4d; padding: 2px 6px; border-radius: 4px; }
        .history-item:hover .delete-chat { opacity: 1; }

        /* CHAT */
        .chat-container { flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .header { padding: 15px 25px; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); }
        .header-left { display: flex; align-items: center; gap: 15px; }
        
        /* Botão Instagram */
        .insta-btn {
            background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
            width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
            text-decoration: none; color: white; font-size: 1.2rem; transition: 0.3s;
        }
        .insta-btn:hover { transform: scale(1.1); box-shadow: 0 0 10px rgba(220, 39, 67, 0.5); }

        .font-controls { display: flex; gap: 8px; }
        .font-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: #a5b4fc; width: 34px; height: 34px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; transition: 0.2s; }
        .font-btn:hover { background: var(--primary); color: white; border-color: var(--primary); }

        #chat-area { flex: 1; padding: 30px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; scroll-behavior: smooth; font-size: 16px; }
        #chat-area::-webkit-scrollbar { width: 6px; } #chat-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }

        .message-wrapper { display: flex; align-items: flex-start; gap: 12px; max-width: 80%; animation: slideIn 0.3s forwards ease-out; }
        .user-wrapper { align-self: flex-end; flex-direction: row-reverse; }
        .bot-wrapper { align-self: flex-start; }
        .avatar { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; background: rgba(255,255,255,0.08); flex-shrink: 0; border: 1px solid var(--glass-border); }
        .message-content { padding: 14px 20px; border-radius: 12px; line-height: 1.6; word-wrap: break-word; position: relative; }
        .message-content img { max-width: 200px; border-radius: 8px; margin-bottom: 8px; display: block; border: 1px solid rgba(255,255,255,0.2); }
        .user-wrapper .message-content { background: var(--primary); color: white; border-bottom-right-radius: 2px; }
        .bot-wrapper .message-content { background: linear-gradient(135deg, rgba(76, 29, 149, 0.4) 0%, rgba(59, 130, 246, 0.2) 100%); border: 1px solid rgba(255, 255, 255, 0.1); color: #f1f5f9; border-bottom-left-radius: 2px; }

        .input-area { padding: 25px; background: rgba(0,0,0,0.2); border-top: 1px solid var(--glass-border); display: flex; gap: 12px; align-items: flex-end; }
        #stop-btn { display: none; background: #ff4d4d; color: white; border: none; width: 50px; height: 50px; border-radius: 10px; cursor: pointer; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(255, 77, 77, 0.3); transition: 0.2s; }
        #stop-btn:hover { background: #ff3333; transform: scale(1.05); }

        #image-preview-container { display: none; position: absolute; bottom: 90px; left: 25px; background: rgba(0,0,0,0.8); padding: 5px; border-radius: 8px; z-index: 10; border: 1px solid rgba(255,255,255,0.2); }
        #image-preview { max-width: 100px; max-height: 100px; border-radius: 4px; display: block; }
        #remove-image { position: absolute; top: -8px; right: -8px; background: red; color: white; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 18px; cursor: pointer; font-size: 12px; }

        input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 16px 20px; border-radius: 8px; color: white; font-size: 1rem; outline: none; transition: 0.3s; }
        input:focus { background: rgba(255,255,255,0.1); border-color: var(--primary); box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.3); }
        
        .attach-btn { background: transparent; border: 1px solid var(--glass-border); width: 50px; height: 50px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .attach-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }
        .attach-btn svg { width: 24px; height: 24px; fill: #a5b4fc; }
        .send-btn { background: var(--primary); border: none; width: 50px; height: 50px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3); }
        .send-btn:hover { transform: translateY(-2px); background: #298eff; }
        .send-btn svg { width: 24px; height: 24px; fill: white; }

        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .typing-indicator { display: none; padding: 10px 15px; background: rgba(255,255,255,0.05); border-radius: 18px; width: fit-content; margin-left: 60px; margin-bottom: 20px; }
        .dot { height: 8px; width: 8px; background: #a5b4fc; border-radius: 50%; display: inline-block; animation: bounce 1.3s infinite ease-in-out; margin: 0 2px; }
        .dot:nth-child(1) { animation-delay: -0.32s; } .dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        .cursor-active::after { content: '|'; animation: blink 0.8s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        @media (max-width: 768px) { .main-wrapper { width: 100%; height: 100vh; border-radius: 0; border: none; } .sidebar { display: none; } }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>

    <div class="main-wrapper">
        <div class="sidebar">
            <button class="new-chat-btn" onclick="iniciarNovoChat()">
                <span style="font-size: 1.2rem;">+</span> INICIAR NOVO CHAT
            </button>
            <div style="font-size:0.75rem; color: #94a3b8; margin-bottom: 12px; font-weight:700; letter-spacing: 1px;">HISTÓRICO</div>
            <div class="history-list" id="history-list"></div>
        </div>

        <div class="chat-container">
            <div class="header">
                <div class="header-left">
                    <div class="avatar" style="background: linear-gradient(45deg, #4f46e5, #06b6d4);">🤖</div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h2 style="margin:0; font-size:1.1rem; letter-spacing: 0.5px;">RafAI</h2>
                            <a href="https://instagram.com/rafaelfilipe651" target="_blank" class="insta-btn" title="Suporte no Instagram">
                                <i class="fa-brands fa-instagram"></i>
                            </a>
                        </div>
                        <div style="font-size: 0.8rem; opacity: 0.7; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                            <div class="status-dot" style="width:8px; height:8px; background:#10b981; border-radius:50%; box-shadow:0 0 5px #10b981;"></div> 
                            Online <span style="font-size: 0.7rem; color: #fbbf24; margin-left: 5px;">(A IA pode cometer erros)</span>
                        </div>
                    </div>
                </div>
                <div class="font-controls">
                    <button class="font-btn" onclick="aumentarFonte()" title="Aumentar Fonte">A+</button>
                    <button class="font-btn" onclick="diminuirFonte()" title="Diminuir Fonte">A-</button>
                </div>
            </div>

            <div id="chat-area"></div>
            <div class="typing-indicator" id="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
            <div id="image-preview-container"><div id="remove-image" onclick="removerImagem()">x</div><img id="image-preview" src="" alt="Preview"></div>

            <div class="input-area">
                <input type="file" id="fileInput" accept="image/*" style="display: none;" onchange="mostrarPreview()">
                <button class="attach-btn" onclick="document.getElementById('fileInput').click()" title="Anexar Imagem"><svg viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"></path></svg></button>
                <input type="text" id="msgInput" placeholder="Cole uma imagem (Ctrl+V) ou digite..." autocomplete="off">
                <button id="send-btn" class="send-btn" onclick="enviar()"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg></button>
                <button id="stop-btn" onclick="pararResposta()" title="Interromper"><div style="width: 16px; height: 16px; background: white; border-radius: 3px;"></div></button>
            </div>
        </div>
    </div>

    <script>
        const chatArea = document.getElementById('chat-area');
        const loader = document.getElementById('loader');
        const historyList = document.getElementById('history-list');
        const sendBtn = document.getElementById('send-btn');
        const stopBtn = document.getElementById('stop-btn');
        
        let imagemSelecionada = null;
        let mimeTypeSelecionado = null;
        let chatAtualId = null;
        let todasConversas = [];
        let animationId = null; 
        let isGenerating = false; 
        let tamanhoFonte = 16; 

        // --- COLAR IMAGEM (CTRL + V) ---
        document.getElementById('msgInput').addEventListener('paste', function(e) {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let index in items) {
                const item = items[index];
                if (item.kind === 'file' && item.type.includes('image/')) {
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        imagemSelecionada = event.target.result;
                        mimeTypeSelecionado = item.type;
                        document.getElementById('image-preview').src = imagemSelecionada;
                        document.getElementById('image-preview-container').style.display = 'block';
                    };
                    reader.readAsDataURL(blob);
                }
            }
        });

        // --- BACKGROUND DINÂMICO ---
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');
        let particles = [];
        function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        const mouse = { x: null, y: null };
        window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1; this.speedX = (Math.random() * 1 - 0.5); this.speedY = (Math.random() * 1 - 0.5);
                const colors = ['rgba(0, 122, 255, 0.5)', 'rgba(79, 70, 229, 0.5)', 'rgba(6, 182, 212, 0.5)'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            update() {
                this.x += this.speedX; this.y += this.speedY;
                if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
                if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
                let dx = mouse.x - this.x; let dy = mouse.y - this.y; let distance = Math.sqrt(dx*dx + dy*dy);
                if (distance < 150) { ctx.beginPath(); ctx.strokeStyle = this.color; ctx.lineWidth = 0.5; ctx.moveTo(this.x, this.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
            }
            draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); }
        }
        function initParticles() { particles = []; let numParticles = (canvas.width * canvas.height) / 15000; for (let i = 0; i < numParticles; i++) particles.push(new Particle()); }
        function animateParticles() { ctx.clearRect(0, 0, canvas.width, canvas.height); for (let i = 0; i < particles.length; i++) { particles[i].update(); particles[i].draw(); } requestAnimationFrame(animateParticles); }
        initParticles(); animateParticles();

        // --- FUNÇÕES DE UI ---
        function aumentarFonte() { tamanhoFonte += 2; document.getElementById("chat-area").style.fontSize = tamanhoFonte + "px"; }
        function diminuirFonte() { tamanhoFonte -= 2; if (tamanhoFonte < 12) tamanhoFonte = 12; document.getElementById("chat-area").style.fontSize = tamanhoFonte + "px"; }
        
        // --- LÓGICA DO CHAT ---
        window.onload = function() {
            todasConversas = JSON.parse(localStorage.getItem('nurseAiChats')) || [];
            if (todasConversas.length > 0) { renderizarSidebar(); carregarConversa(todasConversas[0].id); } 
            else { iniciarNovoChat(); }
        };

        function salvarDados() { localStorage.setItem('nurseAiChats', JSON.stringify(todasConversas)); renderizarSidebar(); }

        function iniciarNovoChat() {
            pararResposta();
            chatAtualId = Date.now();
            const novaConversa = { id: chatAtualId, titulo: "Nova Conversa", mensagens: [] };
            todasConversas.unshift(novaConversa);
            if (todasConversas.length > 10) todasConversas.pop();
            salvarDados();
            carregarConversa(chatAtualId);
        }

        function carregarConversa(id) {
            pararResposta(); chatAtualId = id; chatArea.innerHTML = '';
            const conversa = todasConversas.find(c => c.id === id);
            if (!conversa) return;
            if (conversa.mensagens.length === 0) { renderizarMensagem('Olá! Sou seu assistente de <strong>Enfermagem & IoT</strong>. <br>Como posso ajudar?', 'bot', null, false); }
            else { conversa.mensagens.forEach(msg => { renderizarMensagem(msg.texto, msg.remetente, msg.imagem, false); }); }
            renderizarSidebar();
        }

        function deletarConversa(e, id) {
            e.stopPropagation(); if(!confirm("Apagar esta conversa?")) return;
            todasConversas = todasConversas.filter(c => c.id !== id); salvarDados();
            if (id === chatAtualId) { if (todasConversas.length > 0) carregarConversa(todasConversas[0].id); else iniciarNovoChat(); }
        }

        function renderizarSidebar() {
            historyList.innerHTML = '';
            todasConversas.forEach(conversa => {
                const item = document.createElement('div');
                item.className = `history-item ${conversa.id === chatAtualId ? 'active' : ''}`;
                item.onclick = () => carregarConversa(conversa.id);
                item.innerHTML = `<span>💬 ${conversa.titulo}</span><span class="delete-chat" onclick="deletarConversa(event, ${conversa.id})">✕</span>`;
                historyList.appendChild(item);
            });
        }

        function renderizarMensagem(texto, remetente, imagemSrc, animar) {
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ${remetente === 'user' ? 'user-wrapper' : 'bot-wrapper'}`;
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            avatar.textContent = remetente === 'user' ? '👤' : '🤖';
            const content = document.createElement('div');
            content.className = 'message-content';

            if (remetente === 'bot' && animar) {
                isGenerating = true; alternarBotoes(true);
                content.classList.add('cursor-active');
                wrapper.appendChild(avatar); wrapper.appendChild(content); chatArea.appendChild(wrapper);
                let i = 0; const startTime = Date.now(); const velocidade = 15; wrapper.id = 'msg-animating';
                function digitar() {
                    if (!isGenerating) { content.innerHTML = texto.replace(/\n/g, '<br>'); content.classList.remove('cursor-active'); wrapper.removeAttribute('id'); alternarBotoes(false); return; }
                    const agora = Date.now(); const letrasEsperadas = Math.ceil((agora - startTime) / velocidade);
                    while (i < letrasEsperadas && i < texto.length) { content.innerHTML += texto.charAt(i) === '\n' ? '<br>' : texto.charAt(i); i++; }
                    chatArea.scrollTop = chatArea.scrollHeight;
                    if (i < texto.length) { animationId = requestAnimationFrame(digitar); }
                    else { content.classList.remove('cursor-active'); wrapper.removeAttribute('id'); isGenerating = false; alternarBotoes(false); }
                }
                digitar(); return;
            }

            let html = ""; if(imagemSrc) html += `<img src="${imagemSrc}">`;
            html += texto.replace(/\n/g, '<br>'); content.innerHTML = html;
            if (remetente === 'user') { wrapper.appendChild(content); wrapper.appendChild(avatar); } 
            else { wrapper.appendChild(avatar); wrapper.appendChild(content); }
            chatArea.appendChild(wrapper); chatArea.scrollTop = chatArea.scrollHeight;
        }

        function pararResposta() {
            if (isGenerating) { isGenerating = false; if (animationId) cancelAnimationFrame(animationId); alternarBotoes(false);
                const activeMsg = document.getElementById('msg-animating');
                if (activeMsg) { const content = activeMsg.querySelector('.message-content'); if (content) content.classList.remove('cursor-active'); activeMsg.removeAttribute('id'); }
            }
        }
        function alternarBotoes(gerando) { if (gerando) { sendBtn.style.display = 'none'; stopBtn.style.display = 'flex'; } else { sendBtn.style.display = 'flex'; stopBtn.style.display = 'none'; } }

        function gerarTituloInteligente(mensagem, chatId) {
            const params = new URLSearchParams();
            params.append("acao", "gerar_titulo");
            params.append("mensagem", mensagem);

            fetch(window.location.href, {
                method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString()
            })
            .then(res => res.json())
            .then(data => {
                const index = todasConversas.findIndex(c => c.id === chatId);
                if (index !== -1) {
                    todasConversas[index].titulo = data.resposta;
                    salvarDados();
                }
            });
        }

        function enviar() {
            if (isGenerating) return;
            const input = document.getElementById('msgInput');
            const texto = input.value.trim();
            if (!texto && !imagemSelecionada) return;

            const index = todasConversas.findIndex(c => c.id === chatAtualId);
            if (index === -1) return;

            // Se for a primeira mensagem, chama a IA para gerar o título em paralelo
            if (todasConversas[index].mensagens.length === 0) {
                gerarTituloInteligente(texto, chatAtualId);
            }

            const msgUser = { texto, remetente: 'user', imagem: imagemSelecionada };
            todasConversas[index].mensagens.push(msgUser);
            salvarDados();
            renderizarMensagem(texto, 'user', imagemSelecionada, false);

            const params = new URLSearchParams();
            params.append("acao", "chat"); // Define que é chat normal
            params.append("mensagem", texto);
            if (imagemSelecionada) { params.append("imagem", imagemSelecionada); params.append("mimeType", mimeTypeSelecionado); }

            input.value = ''; removerImagem(); loader.style.display = 'block'; chatArea.scrollTop = chatArea.scrollHeight;

            fetch(window.location.href, {
                method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString()
            })
            .then(res => res.json())
            .then(data => {
                loader.style.display = 'none';
                const msgBot = { texto: data.resposta, remetente: 'bot', imagem: null };
                const currentIndex = todasConversas.findIndex(c => c.id === chatAtualId);
                if (currentIndex !== -1) { todasConversas[currentIndex].mensagens.push(msgBot); salvarDados(); }
                renderizarMensagem(data.resposta, 'bot', null, true);
            })
            .catch(err => { loader.style.display = 'none'; renderizarMensagem("Erro de conexão.", 'bot', null, false); });
        }

        function mostrarPreview() {
            const input = document.getElementById('fileInput'); const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) { imagemSelecionada = e.target.result; mimeTypeSelecionado = file.type; document.getElementById('image-preview').src = imagemSelecionada; document.getElementById('image-preview-container').style.display = 'block'; }
                reader.readAsDataURL(file);
            }
        }
        function removerImagem() { document.getElementById('fileInput').value = ""; imagemSelecionada = null; document.getElementById('image-preview-container').style.display = 'none'; }
        document.getElementById('msgInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') enviar(); });
    </script>
</body>
</html>