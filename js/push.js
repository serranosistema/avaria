/**
 * push.js
 * -----------------------------------------------------------------
 * Cuida só do lado do NAVEGADOR das notificações push:
 *  1. Pede permissão e assina o navegador no Push Manager
 *  2. Salva essa assinatura no Neon (tabela push_subscriptions)
 *  3. Permite desativar (cancela a assinatura e apaga do banco)
 *
 * O ENVIO de fato das notificações roda num serviço separado (fora
 * deste app estático) — veja o projeto brigada-notificacoes/.
 * -----------------------------------------------------------------
 */
import { client } from "./neon-client.js";

// Chave pública VAPID gerada com `npx web-push generate-vapid-keys`.
// É segura pra ficar exposta no código do navegador — só a privada é secreta.
const VAPID_PUBLIC_KEY =
  "BLfpjDv4ZXmYDfPGRGEf1HiXFdQaH6EqJY5lBT1_yBt4iYoK0--eVwpBbAjlz4tHyzWoEcjmyscNlVLdhbdENhk";

const btn = document.getElementById("notifBtn");
if (btn) {
  iniciar();
}

async function iniciar() {
  const suportado =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  if (!suportado) {
    btn.disabled = true;
    btn.title = "Notificações não são suportadas neste navegador";
    btn.style.opacity = "0.4";
    return;
  }

  await atualizarEstadoBotao();
  btn.addEventListener("click", onClick);
}

async function atualizarEstadoBotao() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    const ativo = !!sub && Notification.permission === "granted";
    btn.classList.toggle("active", ativo);
    btn.title = ativo
      ? "Notificações ativadas — clique pra desativar"
      : "Ativar notificações de validade";
  } catch {
    // ambiente sem service worker pronto ainda — mantém estado padrão
  }
}

async function onClick() {
  const jaAtivo = btn.classList.contains("active");
  btn.disabled = true;
  try {
    if (jaAtivo) {
      await desativar();
    } else {
      await ativar();
    }
  } finally {
    btn.disabled = false;
    await atualizarEstadoBotao();
  }
}

async function ativar() {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") {
    await bvAlert(
      "Sem permissão de notificação não dá pra avisar sobre produtos vencendo. Você pode ativar depois nas configurações do navegador.",
    );
    return;
  }

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const subJson = sub.toJSON();

  const { error } = await client.from("push_subscriptions").insert({
    endpoint: subJson.endpoint,
    p256dh: subJson.keys.p256dh,
    auth: subJson.keys.auth,
    funcionario: localStorage.getItem("bv_funcionario") || null,
  });

  // "já existe" (endpoint duplicado) não é erro de verdade — só
  // significa que esse aparelho já tinha assinatura salva
  if (error && !mensagemDeDuplicado(error)) {
    console.warn("[push] falhou ao salvar assinatura no Neon", error);
    const detalhe =
      (error && (error.message || error.details || error.hint)) || "";
    await bvAlert(
      "As notificações foram ativadas no navegador, mas não consegui salvar no banco agora." +
        (detalhe ? `\n\nDetalhe: ${detalhe}` : ""),
    );
    return;
  }

  await bvAlert(
    "Notificações ativadas! Você vai ser avisado quando algum produto entrar em atenção.",
  );
}

async function desativar() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();

  const { error } = await client
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.warn("[push] falhou ao remover assinatura do Neon", error);
  }

  await bvAlert("Notificações desativadas.");
}

function mensagemDeDuplicado(error) {
  const texto = (error && (error.message || error.details || "")) + "";
  return /duplicate|unique|already exists/i.test(texto);
}

// converte a chave pública (base64url, formato do VAPID) pro Uint8Array
// que a PushManager API espera
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
