/**
 * offline-status.js
 * Mostra um aviso quando o aparelho fica sem internet.
 * Importante: isso é só um AVISO visual. Os dados já são salvos
 * direto no localStorage em todas as telas (BVStorage), então
 * nada é perdido mesmo se a internet cair no meio da bipagem.
 */
(function () {
  const banner = document.getElementById("offlineBanner");
  if (!banner) return;

  function atualizar() {
    banner.classList.toggle("show", !navigator.onLine);
  }

  window.addEventListener("online", atualizar);
  window.addEventListener("offline", atualizar);
  atualizar();
})();
