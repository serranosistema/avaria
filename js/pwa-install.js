/**
 * pwa-install.js
 * Controla o botão "Instalar app", no mesmo nível hierárquico do
 * botão de tema, em todas as páginas.
 */
(function () {
  const btn = document.getElementById("installBtn");
  if (!btn) return;

  let deferredPrompt = null;

  // já está rodando instalado (modo standalone)? esconde o botão
  const jaInstalado =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (jaInstalado) {
    btn.style.display = "none";
    return;
  }

  // Chrome/Android/Edge disparam esse evento quando o app é instalável
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  btn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      return;
    }
    // iOS Safari (e navegadores sem suporte ao prompt automático) não
    // disparam beforeinstallprompt — mostramos a instrução manual.
    alert(
      "Pra instalar o app:\n\n" +
        '• iPhone (Safari): toque em Compartilhar → "Adicionar à Tela de Início"\n' +
        '• Android (Chrome): toque no menu (⋮) → "Instalar app" ou "Adicionar à tela inicial"',
    );
  });

  window.addEventListener("appinstalled", () => {
    btn.style.display = "none";
  });
})();
