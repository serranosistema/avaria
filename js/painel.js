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
const clearFiltersBtn = document.getElementById("clearFilters");

const summaryVencido = document.getElementById("summaryVencido");
const summaryAtencao = document.getElementById("summaryAtencao");
const summaryOk = document.getElementById("summaryOk");
const summaryCards = document.querySelectorAll(".summary__card[data-status]");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const addForm = document.getElementById("addForm");
const fCorredor = document.getElementById("fCorredor");
const fCodigo = document.getElementById("fCodigo");
const fDescricao = document.getElementById("fDescricao");
const fQuantidade = document.getElementById("fQuantidade");
const fValidade = document.getElementById("fValidade");

// filtro rápido por status, alternado clicando nos cards de resumo
// (null = sem filtro de status)
let filtroStatus = null;

// quando não-nulo, o formulário do modal está editando esse item
// (em vez de criar um novo)
let modoEdicaoId = null;

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

// monta a URL de busca de imagens no Google pra esse produto,
// combinando descrição + código pra dar mais contexto na busca
function urlBuscaImagem(item) {
  const termo = [item.descricao, item.codigo].filter(Boolean).join(" ").trim();
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(termo || item.codigo || "")}`;
}

// ---------- Render ----------
function renderCorredores(items) {
  const corredores = [
    ...new Set(items.map((i) => i.corredor).filter(Boolean)),
  ].sort();
  const atual = corredorEl.value;
  corredorEl.innerHTML =
    '<option value="">Filtro</option>' +
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

  summaryCards.forEach((card) => {
    const ativo = card.dataset.status === filtroStatus;
    card.classList.toggle("active", ativo);
    card.setAttribute("aria-pressed", String(ativo));
  });
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
          <a class="item__codigo" href="${urlBuscaImagem(item)}" target="_blank" rel="noopener noreferrer" title="Ver imagens desse produto no Google">${escapeHtml(item.codigo || "Sem código")}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg></a>
          ${item.corredor ? `<span class="item__corredor">${escapeHtml(item.corredor)}</span>` : ""}
        </div>
        <div class="item__descricao">${escapeHtml(item.descricao || "Sem descrição")}</div>
        <div class="item__meta">
          <span>Qtd: ${item.quantidade}</span>
          <span>Val: ${validadeFmt}</span>
        </div>
      </div>
      <span class="item__badge">${textoBadge(status, dias)}</span>
      <div class="item__actions">
        <button class="item__edit" data-edit="${item.id}" aria-label="Editar item" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
        </button>
        <button class="item__del" data-del="${item.id}" aria-label="Excluir item" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
          </svg>
        </button>
      </div>
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

function temFiltroAtivo() {
  return !!(searchEl.value.trim() || corredorEl.value || filtroStatus);
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
    const bateStatus =
      !filtroStatus || calcularStatus(i.validade).status === filtroStatus;
    return bateTermo && bateCorredor && bateStatus;
  });

  clearFiltersBtn.classList.toggle("show", temFiltroAtivo());

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

// clique num card de resumo filtra por aquele status; clicar de novo remove o filtro
summaryCards.forEach((card) => {
  card.addEventListener("click", () => {
    filtroStatus =
      filtroStatus === card.dataset.status ? null : card.dataset.status;
    render();
  });
});

clearFiltersBtn.addEventListener("click", () => {
  searchEl.value = "";
  corredorEl.value = "";
  filtroStatus = null;
  render();
});

// quando o sync.js trouxer itens de outro aparelho, atualiza a lista sozinho
window.addEventListener("bv-dados-atualizados", render);

listEl.addEventListener("click", async (e) => {
  const btnDel = e.target.closest("[data-del]");
  if (btnDel) {
    const ok = await bvConfirm(
      "Excluir este item? Essa ação não pode ser desfeita.",
      { textoConfirmar: "Excluir", perigo: true },
    );
    if (ok) {
      BVStorage.deleteItem(btnDel.dataset.del);
      render();
    }
    return;
  }

  const btnEdit = e.target.closest("[data-edit]");
  if (btnEdit) {
    abrirModalEdicao(btnEdit.dataset.edit);
  }
});

// ---------- Modal (cadastro manual + edição) ----------
function abrirModalAdicao() {
  modoEdicaoId = null;
  modalTitle.textContent = "Adicionar item manualmente";
  addForm.reset();
  fQuantidade.value = "1";
  modalOverlay.classList.add("show");
}

function abrirModalEdicao(id) {
  const item = BVStorage.getItems().find((i) => i.id === id);
  if (!item) return;
  modoEdicaoId = id;
  modalTitle.textContent = "Editar item";
  fCorredor.value = item.corredor || "";
  fCodigo.value = item.codigo || "";
  fDescricao.value = item.descricao || "";
  fQuantidade.value = item.quantidade ?? 1;
  fValidade.value = item.validade || "";
  modalOverlay.classList.add("show");
}

function fecharModal() {
  modalOverlay.classList.remove("show");
  modoEdicaoId = null;
}

document
  .getElementById("openAddModal")
  .addEventListener("click", abrirModalAdicao);
document.getElementById("closeAddModal").addEventListener("click", fecharModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) fecharModal();
});

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const dados = {
    corredor: fCorredor.value.trim(),
    codigo: fCodigo.value.trim(),
    descricao: fDescricao.value.trim(),
    quantidade: fQuantidade.value,
    validade: fValidade.value,
  };

  if (modoEdicaoId) {
    BVStorage.editarItem(modoEdicaoId, dados);
  } else {
    BVStorage.addItem(dados);
  }

  addForm.reset();
  modalOverlay.classList.remove("show");
  modoEdicaoId = null;
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
