/**
 * confirm.js
 * -----------------------------------------------------------------
 * Substitui os confirm()/alert() nativos do navegador (que aparecem
 * colados no topo da tela, fora do visual do app) por um modal com a
 * mesma cara do resto do app.
 *
 * Uso:
 *   const ok = await bvConfirm("Excluir este item?", { textoConfirmar: "Excluir", perigo: true });
 *   if (ok) { ... }
 *
 *   await bvAlert("Preencha o nome de quem está conferindo.");
 * -----------------------------------------------------------------
 */

function bvCriarOverlay(mensagem, botoesHtml) {
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-box" role="alertdialog" aria-modal="true">
      <p class="confirm-message"></p>
      <div class="confirm-actions">${botoesHtml}</div>
    </div>`;
  overlay.querySelector(".confirm-message").textContent = mensagem;
  document.body.appendChild(overlay);
  // classe "show" num segundo frame pra animação de entrada disparar
  requestAnimationFrame(() =>
    requestAnimationFrame(() => overlay.classList.add("show")),
  );
  return overlay;
}

function bvFecharOverlay(overlay) {
  overlay.classList.remove("show");
  setTimeout(() => overlay.remove(), 200);
}

window.bvConfirm = function (mensagem, opcoes = {}) {
  return new Promise((resolve) => {
    const textoCancelar = opcoes.textoCancelar || "Cancelar";
    const textoConfirmar = opcoes.textoConfirmar || "Confirmar";
    const classeConfirmar = opcoes.perigo
      ? "btn btn--primary btn--danger"
      : "btn btn--primary";

    const overlay = bvCriarOverlay(
      mensagem,
      `<button type="button" class="btn btn--ghost" data-acao="cancelar">${textoCancelar}</button>
       <button type="button" class="${classeConfirmar}" data-acao="confirmar">${textoConfirmar}</button>`,
    );

    function concluir(resultado) {
      bvFecharOverlay(overlay);
      resolve(resultado);
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) concluir(false);
    });
    overlay
      .querySelector('[data-acao="cancelar"]')
      .addEventListener("click", () => concluir(false));
    overlay
      .querySelector('[data-acao="confirmar"]')
      .addEventListener("click", () => concluir(true));
  });
};

window.bvAlert = function (mensagem, opcoes = {}) {
  return new Promise((resolve) => {
    const texto = opcoes.texto || "Entendi";
    const overlay = bvCriarOverlay(
      mensagem,
      `<button type="button" class="btn btn--primary" data-acao="ok">${texto}</button>`,
    );
    overlay
      .querySelector(".confirm-actions")
      .classList.add("confirm-actions--single");

    function concluir() {
      bvFecharOverlay(overlay);
      resolve();
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) concluir();
    });
    overlay
      .querySelector('[data-acao="ok"]')
      .addEventListener("click", concluir);
  });
};
