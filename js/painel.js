/**
 * painel.js — tela principal da Brigada de Validade
 * Lê/grava itens via BVStorage (localStorage na Fase 1).
 */

// quantos dias antes do vencimento já conta como "atenção"
const DIAS_ATENCAO = 15;

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("emptyState");
const searchEl = document.getElementById("searchInput");
const corredorEl = document.getElementById("corredorFilter");
const alertBanner = document.getElementById("alertBanner");

const summaryVencido = document.getElementById("summaryVencido");
const summaryAtencao = document.getElementById("summaryAtencao");
const summaryOk = document.getElementById("summaryOk");

const modalOverlay = document.getElementById("modalOverlay");
const addForm = document.getElementById("addForm");

// ---------- Status de validade ----------
function calcularStatus(dataValidade) {
  if (!dataValidade) return { status: "ok", dias: null };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade + "T00:00:00");
  const diffMs = validade - hoje;
  const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (dias < 0) return { status: "vencido", dias };
  if (dias <= DIAS_ATENCAO) return { status: "atencao", dias };
  return { status: "ok", dias };
}

function textoBadge(status, dias) {
  if (status === "vencido") return `Vencido há ${Math.abs(dias)}d`;
  if (status === "atencao")
    return dias === 0 ? "Vence hoje" : `Vence em ${dias}d`;
  return "Dentro do prazo";
}

// ---------- Render ----------
function renderCorredores(items) {
  const corredores = [
    ...new Set(items.map((i) => i.corredor).filter(Boolean)),
  ].sort();
  const atual = corredorEl.value;
  corredorEl.innerHTML =
    '<option value="">Todos corredores</option>' +
    corredores.map((c) => `<option value="${c}">${c}</option>`).join("");
  if (corredores.includes(atual)) corredorEl.value = atual;
}

function renderSummary(items) {
  const contagem = { vencido: 0, atencao: 0, ok: 0 };
  items.forEach((i) => {
    const { status } = calcularStatus(i.validade);
    contagem[status]++;
  });
  summaryVencido.textContent = contagem.vencido;
  summaryAtencao.textContent = contagem.atencao;
  summaryOk.textContent = contagem.ok;

  alertBanner.classList.toggle("show", contagem.vencido > 0);
  if (contagem.vencido > 0) {
    alertBanner.textContent = `⚠ ${contagem.vencido} produto${contagem.vencido > 1 ? "s" : ""} vencido${contagem.vencido > 1 ? "s" : ""} — retire da prateleira`;
  }
}

function itemHtml(item) {
  const { status, dias } = calcularStatus(item.validade);
  const validadeFmt = item.validade
    ? new Date(item.validade + "T00:00:00").toLocaleDateString("pt-BR")
    : "—";

  return `
    <div class="item item--${status}" data-id="${item.id}">
      <div class="item__main">
        <div class="item__top">
          <span class="item__codigo">${escapeHtml(item.codigo || "Sem código")}</span>
          ${item.corredor ? `<span class="item__corredor">Corredor ${escapeHtml(item.corredor)}</span>` : ""}
        </div>
        <div class="item__descricao">${escapeHtml(item.descricao || "Sem descrição")}</div>
        <div class="item__meta">
          <span>Qtd: ${item.quantidade}</span>
          <span>Val: ${validadeFmt}</span>
        </div>
      </div>
      <span class="item__badge">${textoBadge(status, dias)}</span>
      <button class="item__del" data-del="${item.id}" aria-label="Excluir item" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
        </svg>
      </button>
    </div>`;
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m],
  );
}

function render() {
  let items = BVStorage.getItems();
  renderCorredores(items);
  renderSummary(items);

  const termo = searchEl.value.trim().toLowerCase();
  const corredorSel = corredorEl.value;

  let filtrados = items.filter((i) => {
    const bateTermo =
      !termo ||
      (i.codigo && i.codigo.toLowerCase().includes(termo)) ||
      (i.descricao && i.descricao.toLowerCase().includes(termo));
    const bateCorredor = !corredorSel || i.corredor === corredorSel;
    return bateTermo && bateCorredor;
  });

  // ordena: vencido > atenção > ok, e dentro de cada grupo, validade mais próxima primeiro
  const peso = { vencido: 0, atencao: 1, ok: 2 };
  filtrados.sort((a, b) => {
    const sa = calcularStatus(a.validade);
    const sb = calcularStatus(b.validade);
    if (peso[sa.status] !== peso[sb.status])
      return peso[sa.status] - peso[sb.status];
    return (sa.dias ?? 9999) - (sb.dias ?? 9999);
  });

  if (filtrados.length === 0) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
  } else {
    emptyEl.style.display = "none";
    listEl.innerHTML = filtrados.map(itemHtml).join("");
  }
}

// ---------- Eventos ----------
searchEl.addEventListener("input", render);
corredorEl.addEventListener("change", render);

// quando o sync.js trouxer itens de outro aparelho, atualiza a lista sozinho
window.addEventListener("bv-dados-atualizados", render);

listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-del]");
  if (!btn) return;
  if (confirm("Excluir este item?")) {
    BVStorage.deleteItem(btn.dataset.del);
    render();
  }
});

// modal de cadastro manual
document.getElementById("openAddModal").addEventListener("click", () => {
  modalOverlay.classList.add("show");
});
document.getElementById("closeAddModal").addEventListener("click", () => {
  modalOverlay.classList.remove("show");
});
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove("show");
});

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const dados = {
    corredor: document.getElementById("fCorredor").value.trim(),
    codigo: document.getElementById("fCodigo").value.trim(),
    descricao: document.getElementById("fDescricao").value.trim(),
    quantidade: document.getElementById("fQuantidade").value,
    validade: document.getElementById("fValidade").value,
  };
  BVStorage.addItem(dados);
  addForm.reset();
  modalOverlay.classList.remove("show");
  render();
});

// ---------- Saudação ----------
document.getElementById("funcName").textContent =
  localStorage.getItem("bv_funcionario") || "Convidado";

// (o botão de logout é tratado no <script type="module"> do painel.html,
// porque precisa chamar o auth.js pra encerrar a sessão de verdade)

// ---------- Tema (mesmo padrão do index.html) ----------
(function initTheme() {
  const root = document.documentElement;
  const toggleBtn = document.getElementById("themeToggle");
  const iconMoon = document.getElementById("iconMoon");
  const iconSun = document.getElementById("iconSun");

  function applyTheme(theme) {
    root.classList.toggle("dark", theme === "dark");
    iconMoon.style.display = theme === "dark" ? "none" : "block";
    iconSun.style.display = theme === "dark" ? "block" : "none";
    localStorage.setItem("bv_theme", theme);
  }

  const saved =
    localStorage.getItem("bv_theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  applyTheme(saved);

  toggleBtn.addEventListener("click", () => {
    applyTheme(root.classList.contains("dark") ? "light" : "dark");
  });
})();

render();
