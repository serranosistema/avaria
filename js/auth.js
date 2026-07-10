/**
 * auth.js — login, logout e verificação de sessão via Neon Auth.
 * -----------------------------------------------------------------
 * Módulo ES. Usa o client único (js/neon-client.js) — nunca cria
 * outra instância, pra não ter configurações divergentes.
 *
 * - login(email, senha): usado no index.html
 * - logout(): usado no botão "Sair" do painel
 * - sessaoValida(): usado no topo de painel.html/scanner.html/
 *   relatorio.html — valida um token assinado pelo Neon. Diferente
 *   de uma flag solta no localStorage, ninguém "forja" isso pelo
 *   DevTools do navegador.
 * -----------------------------------------------------------------
 */
import { client } from "./neon-client.js";

export async function login(email, senha) {
  return client.auth.signIn.email({ email, password: senha });
}

export async function logout() {
  await client.auth.signOut();
  localStorage.removeItem("bv_funcionario");
  window.location.href = "index.html";
}

export async function sessaoValida() {
  try {
    const { data } = await client.auth.getSession();
    return !!(data && data.session);
  } catch {
    return false;
  }
}

export async function usuarioAtual() {
  try {
    const { data } = await client.auth.getSession();
    return data?.user || null;
  } catch {
    return null;
  }
}
