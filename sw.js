// Define um nome para o nosso cache
const CACHE_NAME = 'rafia-v1';

// Lista de arquivos que o Service Worker deve armazenar em cache
const urlsToCache = [
  '/', // A raiz do site
  'index.html', // O arquivo HTML principal
  'https://images.squarespace-cdn.com/content/v1/55b7e44de4b0af4724ac5dd6/ad3872eb-0dbb-4abf-b855-df0c6114ba02/sylvester-g406905444_1920.jpg', // A imagem de fundo inicial
  'https://th.bing.com/th/id/R.331e5cae1b0a48eb2e9b8b60f6215ccc?rik=uYt8BpIAdfWbaw&riu=http%3a%2f%2f3.bp.blogspot.com%2f-epewZU8XcmU%2fUpUnRsihyyI%2fAAAAAAADU3w%2fcccEQlLBabA%2fs1600%2ffeliz-ano-novo-gif%2b(7).gif&ehk=R2O2bemfF8RLwoSTu1riiO3oi9S%2bQE2A7xOgi9ZEI8U%3d&risl=&pid=ImgRaw&r=0', // O GIF de fundo final
  'icone-192x192.png', // O ícone
  'icone-512x512.png'  // O outro ícone
];

// Evento 'install': é acionado quando o service worker é instalado pela primeira vez.
self.addEventListener('install', event => {
  // Espera até que a promessa dentro de waitUntil seja resolvida
  event.waitUntil(
    // Abre o cache com o nome que definimos
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        // Adiciona todos os nossos arquivos ao cache
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': é acionado toda vez que a página faz uma requisição (ex: pede uma imagem, um script).
self.addEventListener('fetch', event => {
  event.respondWith(
    // Tenta encontrar a requisição no cache
    caches.match(event.request)
      .then(response => {
        // Se a resposta for encontrada no cache, retorna a versão do cache
        if (response) {
          return response;
        }
        // Se não for encontrada no cache, faz a requisição à rede
        return fetch(event.request);
      }
    )
  );
});
