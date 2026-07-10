/**
 * service-worker.js
 * -----------------------------------------------------------------
 * Garante que o app (telas + bibliotecas externas) abre e funciona
 * mesmo sem internet. Isso é sobre o APP carregar offline — os
 * DADOS bipados já são salvos direto no localStorage a cada item
 * (veja js/storage-local.js), então eles nunca dependem de rede.
 *
 * Estratégia: "stale-while-revalidate" — sempre responde do cache
 * na hora (rápido e funciona offline), e atualiza o cache em segundo
 * plano se houver internet, pra próxima vez já vir a versão nova.
 * -----------------------------------------------------------------
 */

const CACHE = "brigada-validade-v5";

// arquivos do próprio app — se algum path aqui estiver errado, a
// instalação do service worker falha (assim você percebe o erro).
const APP_SHELL = [
  "./",
  "./index.html",
  "./painel.html",
  "./scanner.html",
  "./relatorio.html",
  "./manifest.json",
  "./icons/favicon.ico",
  "./icons/favicon-16x16.png",
  "./icons/favicon-32x32.png",
  "./icons/apple-touch-icon.png",
  "./icons/android-chrome-192x192.png",
  "./icons/android-chrome-512x512.png",
  "./css/style.css",
  "./css/painel.css",
  "./css/scanner.css",
  "./css/relatorio.css",
  "./js/storage-local.js",
  "./js/painel.js",
  "./js/scanner.js",
  "./js/relatorio.js",
  "./js/pwa-install.js",
  "./js/offline-status.js",
  "./js/db.js",
  "./js/sync.js",
];

// bibliotecas de terceiros (CDN) usadas no scanner e no relatório.
// cacheadas à parte, sem derrubar a instalação inteira se uma falhar
// (ex: se o usuário instalar o app já sem internet).
const CDN_LIBS = [
  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
  "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js",
  "https://unpkg.com/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.js",
  "https://unpkg.com/signature_pad@4.1.7/dist/signature_pad.umd.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // cacheia cada arquivo do app shell individualmente — se um
      // único arquivo estiver com caminho/nome errado (404), ele fica
      // de fora, mas NÃO derruba a instalação inteira do service worker.
      // Se algo falhar, aparece um aviso no console com a URL exata.
      await Promise.allSettled(
        APP_SHELL.map((url) =>
          fetch(url)
            .then((resp) => {
              if (resp.ok) {
                cache.put(url, resp);
              } else {
                console.warn(
                  "[service-worker] não encontrado (" + resp.status + "):",
                  url,
                );
              }
            })
            .catch((err) =>
              console.warn("[service-worker] falhou ao buscar:", url, err),
            ),
        ),
      );

      // bibliotecas de CDN — mesma lógica resiliente
      await Promise.allSettled(
        CDN_LIBS.map((url) =>
          fetch(url, { mode: "cors" })
            .then((resp) => {
              if (resp.ok) return cache.put(url, resp);
            })
            .catch(() => {
              // sem internet na hora de instalar — tenta cachear
              // essa lib de novo mais tarde, quando for acessada
            }),
        ),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // só trata GET — POSTs (se um dia existirem, ex: sync com banco)
  // passam direto pra rede
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const buscaRedeEAtualiza = fetch(request)
        .then((resposta) => {
          if (resposta && resposta.ok) {
            caches
              .open(CACHE)
              .then((cache) => cache.put(request, resposta.clone()));
          }
          return resposta;
        })
        .catch(() => null);

      // responde do cache na hora se existir; senão espera a rede
      return (
        cached ||
        buscaRedeEAtualiza ||
        new Response("Offline e este recurso ainda não foi salvo no cache.", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        })
      );
    }),
  );
});
