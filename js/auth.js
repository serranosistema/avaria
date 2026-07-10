/**
 * auth.js — login, logout e verificação de sessão manual (Direto no Banco).
 * -----------------------------------------------------------------
 * Como desativamos o Auth Beta do Neon, a sessão agora é gerenciada
 * verificando o usuário na tabela 'usuarios' e salvando no localStorage.
 * -----------------------------------------------------------------
 */
import { client } from "./neon-client.js";

export async function login(email, senha) {
  try {
    // Faz a consulta direta no banco
    const { data, error } = await client
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .eq("senha", senha)
      .single();

    if (error || !data) {
      return { error: { message: "E-mail ou senha incorretos." } };
    }

    // Login com sucesso: salva os dados do usuário no localStorage
    localStorage.setItem("bv_usuario_logado", JSON.stringify(data));

    // Atualiza também a flag do funcionário caso use em outros lugares
    localStorage.setItem("bv_funcionario", data.nome);

    return { data, error: null };
  } catch (err) {
    return { error: { message: "Falha de conexão ou credenciais inválidas." } };
  }
}

export async function logout() {
  // Limpa tudo e manda pra tela inicial
  localStorage.removeItem("bv_usuario_logado");
  localStorage.removeItem("bv_funcionario");
  window.location.href = "index.html";
}

export async function sessaoValida() {
  // Como não há mais token do servidor, a sessão é válida se o registro existir no localStorage
  const userStr = localStorage.getItem("bv_usuario_logado");
  return !!userStr;
}

export async function usuarioAtual() {
  try {
    const userStr = localStorage.getItem("bv_usuario_logado");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}
