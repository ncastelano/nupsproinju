// Service worker mínimo: só habilita instalação do PWA.
// Sem cache de páginas/dados — conteúdo é sensível e sempre vem do servidor.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
