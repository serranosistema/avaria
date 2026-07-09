/**
 * relatorio.js — geração do relatório de auditoria
 * Lê itens via BVStorage, filtra por data, e gera CSV ou PDF assinado.
 */

const DIAS_ATENCAO = 15;

const dataDeEl = document.getElementById("dataDe");
const dataAteEl = document.getElementById("dataAte");
const corredorEl = document.getElementById("corredorFilter");

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("emptyState");

const summaryTotal = document.getElementById("summaryTotal");
const summaryVencido = document.getElementById("summaryVencido");
const summaryAtencao = document.getElementById("summaryAtencao");

const conferidoPorEl = document.getElementById("conferidoPor");
const observacoesEl = document.getElementById("observacoes");

const btnExportCsv = document.getElementById("exportCsv");
const btnExportPdf = document.getElementById("exportPdf");
const btnClearSign = document.getElementById("clearSign");

let itensFiltrados = [];

// hoje como padrão nos dois campos
const hojeISO = new Date().toISOString().slice(0, 10);
dataDeEl.value = hojeISO;
dataAteEl.value = hojeISO;

// ---------- Status (mesma regra do painel) ----------
function calcularStatus(dataValidade) {
  if (!dataValidade) return { status: "ok", dias: null };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade + "T00:00:00");
  const dias = Math.round((validade - hoje) / 86400000);
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

function formatarDataBR(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
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

// ---------- Filtro e render ----------
function dentroDoPeriodo(item) {
  const dia = item.dataBipagem ? item.dataBipagem.slice(0, 10) : null;
  if (!dia) return false;
  return dia >= dataDeEl.value && dia <= dataAteEl.value;
}

function renderCorredores(items) {
  const corredores = [
    ...new Set(items.map((i) => i.corredor).filter(Boolean)),
  ].sort();
  const atual = corredorEl.value;
  corredorEl.innerHTML =
    '<option value="">Todos</option>' +
    corredores.map((c) => `<option value="${c}">${c}</option>`).join("");
  if (corredores.includes(atual)) corredorEl.value = atual;
}

function itemHtml(item) {
  const { status, dias } = calcularStatus(item.validade);
  return `
    <div class="item item--${status}">
      <div class="item__main">
        <div class="item__top">
          <span class="item__codigo">${escapeHtml(item.codigo || "Sem código")}</span>
          ${item.corredor ? `<span class="item__corredor">Corredor ${escapeHtml(item.corredor)}</span>` : ""}
        </div>
        <div class="item__descricao">${escapeHtml(item.descricao || "Sem descrição")}</div>
        <div class="item__meta">
          <span>Qtd: ${item.quantidade}</span>
          <span>Val: ${item.validade ? formatarDataBR(item.validade) : "—"}</span>
          <span>Por: ${escapeHtml(item.funcionario || "—")}</span>
        </div>
      </div>
      <span class="item__badge">${textoBadge(status, dias)}</span>
    </div>`;
}

function render() {
  const todos = BVStorage.getItems();
  renderCorredores(todos);

  itensFiltrados = todos.filter((i) => {
    const noPeriodo = dentroDoPeriodo(i);
    const bateCorredor = !corredorEl.value || i.corredor === corredorEl.value;
    return noPeriodo && bateCorredor;
  });

  const contagem = { vencido: 0, atencao: 0, ok: 0 };
  itensFiltrados.forEach((i) => contagem[calcularStatus(i.validade).status]++);

  summaryTotal.textContent = itensFiltrados.length;
  summaryVencido.textContent = contagem.vencido;
  summaryAtencao.textContent = contagem.atencao;

  if (itensFiltrados.length === 0) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
  } else {
    emptyEl.style.display = "none";
    listEl.innerHTML = itensFiltrados.map(itemHtml).join("");
  }
}

dataDeEl.addEventListener("change", render);
dataAteEl.addEventListener("change", render);
corredorEl.addEventListener("change", render);

document.getElementById("chipHoje").addEventListener("click", () => {
  dataDeEl.value = hojeISO;
  dataAteEl.value = hojeISO;
  render();
});

document.getElementById("chipOntem").addEventListener("click", () => {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const iso = ontem.toISOString().slice(0, 10);
  dataDeEl.value = iso;
  dataAteEl.value = iso;
  render();
});

document.getElementById("chip7dias").addEventListener("click", () => {
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
  dataDeEl.value = seteDiasAtras.toISOString().slice(0, 10);
  dataAteEl.value = hojeISO;
  render();
});

// ---------- Assinatura ----------
const canvas = document.getElementById("signaturePad");
let signaturePad = null;

function ajustarCanvas() {
  if (!canvas) return;

  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvas.getBoundingClientRect();

  // define tamanho real do canvas em px físicos
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);

  // reseta transform antes de aplicar (evita acumular scale no resize)
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  // limpa assinatura existente após resize
  if (signaturePad && typeof signaturePad.clear === "function") {
    signaturePad.clear();
  }
}

// 1) ajusta primeiro
ajustarCanvas();

// 2) cria instância correta do UMD
signaturePad = new window.SignaturePad(canvas, {
  backgroundColor: "rgba(0,0,0,0)",
  penColor:
    getComputedStyle(document.documentElement)
      .getPropertyValue("--foreground")
      .trim() || "#111",
});

// mantém compatibilidade com seu código atual
window.signaturePad = signaturePad;

window.addEventListener("resize", ajustarCanvas);

btnClearSign.addEventListener("click", () => {
  if (signaturePad && typeof signaturePad.clear === "function") {
    signaturePad.clear();
  }
});

// ---------- Exportar CSV ----------
btnExportCsv.addEventListener("click", () => {
  if (itensFiltrados.length === 0) {
    alert("Não há itens no período selecionado.");
    return;
  }

  const cabecalho = [
    "Corredor",
    "Código",
    "Descrição",
    "Quantidade",
    "Validade",
    "Funcionário",
    "Data/Hora bipagem",
  ];
  const linhas = itensFiltrados.map((i) => [
    i.corredor,
    i.codigo,
    i.descricao,
    i.quantidade,
    i.validade ? formatarDataBR(i.validade) : "",
    i.funcionario,
    i.dataBipagem ? new Date(i.dataBipagem).toLocaleString("pt-BR") : "",
  ]);

  const csv = [cabecalho, ...linhas]
    .map((linha) =>
      linha.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"),
    )
    .join("\n");

  // \uFEFF (BOM) garante acentuação correta ao abrir no Excel
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `brigada-${dataDeEl.value}_a_${dataAteEl.value}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ---------- Exportar PDF ----------
btnExportPdf.addEventListener("click", () => {
  if (itensFiltrados.length === 0) {
    alert("Não há itens no período selecionado.");
    return;
  }
  if (!conferidoPorEl.value.trim()) {
    alert("Preencha o nome de quem está conferindo antes de gerar o PDF.");
    conferidoPorEl.focus();
    return;
  }
  if (window.signaturePad.isEmpty()) {
    alert(
      "Peça pra quem está conferindo assinar no campo de assinatura antes de gerar o PDF.",
    );
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Brigada de Validade — Conti", 14, 18);

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  const periodo =
    dataDeEl.value === dataAteEl.value
      ? formatarDataBR(dataDeEl.value)
      : `${formatarDataBR(dataDeEl.value)} a ${formatarDataBR(dataAteEl.value)}`;
  doc.text(`Período da auditoria: ${periodo}`, 14, 25);
  doc.text(`Corredor: ${corredorEl.value || "Todos"}`, 14, 30);
  doc.text(`Total de itens: ${itensFiltrados.length}`, 14, 35);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 40);

  doc.autoTable({
    startY: 46,
    head: [
      [
        "Corredor",
        "Código",
        "Descrição",
        "Qtd",
        "Validade",
        "Situação",
        "Funcionário",
      ],
    ],
    body: itensFiltrados.map((i) => {
      const { status, dias } = calcularStatus(i.validade);
      return [
        i.corredor || "—",
        i.codigo || "—",
        i.descricao || "—",
        i.quantidade,
        i.validade ? formatarDataBR(i.validade) : "—",
        textoBadge(status, dias),
        i.funcionario || "—",
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [109, 40, 217] },
    theme: "striped",
  });

  let y = doc.lastAutoTable.finalY + 12;

  if (observacoesEl.value.trim()) {
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Observações:", 14, y);
    doc.setFont(undefined, "normal");
    const linhas = doc.splitTextToSize(observacoesEl.value.trim(), 180);
    doc.text(linhas, 14, y + 5);
    y += 5 + linhas.length * 5 + 8;
  }

  // se estiver perto do fim da página, pula pra próxima antes da assinatura
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("Conferido por:", 14, y);
  doc.setFont(undefined, "normal");
  doc.text(conferidoPorEl.value.trim(), 45, y);

  const assinaturaImg = window.signaturePad.toDataURL("image/png");
  doc.text("Assinatura:", 14, y + 20);
  doc.addImage(assinaturaImg, "PNG", 14, y + 23, 70, 25);
  doc.line(14, y + 50, 84, y + 50);

  const nomeArquivo =
    dataDeEl.value === dataAteEl.value
      ? `relatorio-brigada-${dataDeEl.value}.pdf`
      : `relatorio-brigada-${dataDeEl.value}_a_${dataAteEl.value}.pdf`;
  doc.save(nomeArquivo);
});

// ---------- Tema (mesmo padrão das outras telas) ----------
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
