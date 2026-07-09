/**
 * scanner.js — tela de bipagem
 * Usa a lib html5-qrcode (CDN) pra ler código de barras pela câmera.
 * Salva os itens via BVStorage (mesma camada de dados do painel).
 */

let html5QrCode = null;
let cameraAtiva = false;
let torchLigada = false;

const btnModoCamera = document.getElementById("modoCamera");
const btnModoManual = document.getElementById("modoManual");
const scanArea = document.getElementById("scanArea");
const scanHint = document.getElementById("scanHint");
const torchBtn = document.getElementById("torchBtn");
const cameraError = document.getElementById("cameraError");

const codigoInput = document.getElementById("fCodigo");
const codigoWrap = document.getElementById("codigoWrap");
const corredorInput = document.getElementById("fCorredor");
const descricaoInput = document.getElementById("fDescricao");
const quantidadeInput = document.getElementById("fQuantidade");
const validadeInput = document.getElementById("fValidade");

const toast = document.getElementById("toast");
const recentList = document.getElementById("recentList");

// mantém o último corredor entre bipagens (fluxo normal: bipa vários itens do mesmo corredor)
corredorInput.value = sessionStorage.getItem("bv_ultimo_corredor") || "";

// ---------- Alternar modo câmera / manual ----------
function setModo(modo) {
  const camera = modo === "camera";
  btnModoCamera.classList.toggle("active", camera);
  btnModoManual.classList.toggle("active", !camera);
  scanArea.style.display = camera ? "block" : "none";
  scanHint.style.display = camera ? "block" : "none";

  if (camera) {
    iniciarCamera();
  } else {
    pararCamera();
    codigoInput.focus();
  }
}

btnModoCamera.addEventListener("click", () => setModo("camera"));
btnModoManual.addEventListener("click", () => setModo("manual"));

// ---------- Câmera ----------
function iniciarCamera() {
  if (cameraAtiva || typeof Html5Qrcode === "undefined") return;

  html5QrCode = new Html5Qrcode("reader");
  const config = {
    fps: 10,
    qrbox: { width: 260, height: 140 },
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.QR_CODE,
    ],
  };

  html5QrCode
    .start({ facingMode: "environment" }, config, onScanSuccess, () => {})
    .then(() => {
      cameraAtiva = true;
      cameraError.classList.remove("show");
      verificarTorch();
    })
    .catch(() => {
      cameraError.classList.add("show");
      scanArea.style.display = "none";
    });
}

function pararCamera() {
  if (html5QrCode && cameraAtiva) {
    html5QrCode
      .stop()
      .then(() => {
        html5QrCode.clear();
        cameraAtiva = false;
        torchBtn.classList.remove("show", "active");
      })
      .catch(() => {});
  }
}

function verificarTorch() {
  try {
    const capabilities = html5QrCode.getRunningTrackCapabilities();
    if (capabilities && capabilities.torch) {
      torchBtn.classList.add("show");
    }
  } catch {
    // torch não suportado nesse aparelho/navegador — mantém o botão escondido
  }
}

torchBtn.addEventListener("click", async () => {
  if (!cameraAtiva) return;
  try {
    torchLigada = !torchLigada;
    await html5QrCode.applyVideoConstraints({
      advanced: [{ torch: torchLigada }],
    });
    torchBtn.classList.toggle("active", torchLigada);
  } catch {
    torchLigada = false;
  }
});

function onScanSuccess(codigoLido) {
  codigoInput.value = codigoLido;
  codigoWrap.classList.add("filled");
  if (navigator.vibrate) navigator.vibrate(80);
  descricaoInput.focus();
}

codigoInput.addEventListener("input", () => {
  codigoWrap.classList.toggle("filled", codigoInput.value.trim().length > 0);
});

// ---------- Salvar item ----------
document.getElementById("itemForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const dados = {
    corredor: corredorInput.value.trim(),
    codigo: codigoInput.value.trim(),
    descricao: descricaoInput.value.trim(),
    quantidade: quantidadeInput.value,
    validade: validadeInput.value,
  };

  const novo = BVStorage.addItem(dados);
  sessionStorage.setItem("bv_ultimo_corredor", dados.corredor);

  mostrarToast();
  adicionarNaListaRecente(novo);

  // limpa só código/descrição/quantidade/validade — mantém o corredor
  codigoInput.value = "";
  descricaoInput.value = "";
  quantidadeInput.value = "1";
  validadeInput.value = "";
  codigoWrap.classList.remove("filled");

  if (cameraAtiva) {
    // volta o foco pro fluxo de câmera pro próximo bipe
  } else {
    codigoInput.focus();
  }
});

function mostrarToast() {
  toast.classList.add("show");
  clearTimeout(mostrarToast._t);
  mostrarToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function adicionarNaListaRecente(item) {
  const li = document.createElement("div");
  li.className = "recent-item";
  li.innerHTML = `
    <span><span class="codigo">${escapeHtml(item.codigo || "Sem código")}</span> — <span class="desc">${escapeHtml(item.descricao || "Sem descrição")}</span></span>
    <span>${item.quantidade}un</span>`;
  recentList.prepend(li);
  // mantém só os últimos 5 na tela
  [...recentList.children].slice(5).forEach((el) => el.remove());
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

// inicia direto no modo câmera
setModo("camera");

// libera a câmera se o usuário sair da página
window.addEventListener("beforeunload", pararCamera);
