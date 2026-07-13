/**
 * db.js — conversa com o Neon Data API (Postgres) via SDK oficial.
 * -----------------------------------------------------------------
 * É um módulo ES (por isso o <script type="module"> no HTML) porque
 * o pacote @neondatabase/neon-js é distribuído nesse formato.
 *
 * Não é chamado direto pelas telas (painel.js, scanner.js) — quem usa
 * essas funções é o js/sync.js, que roda por trás sincronizando o que
 * está no localStorage com o banco.
 * -----------------------------------------------------------------
 */
import { client } from "./neon-client.js";

const TABELA = "itens_validade";

// converte snake_case do banco -> camelCase que o app já usa
function paraApp(row) {
  return {
    id: row.id,
    corredor: row.corredor,
    codigo: row.codigo,
    descricao: row.descricao,
    quantidade: row.quantidade,
    validade: row.validade,
    funcionario: row.funcionario,
    dataBipagem: row.data_bipagem,
  };
}

// converte camelCase do app -> snake_case das colunas do banco
function paraBanco(item) {
  const linha = {
    corredor: item.corredor,
    codigo: item.codigo,
    descricao: item.descricao ?? null,
    quantidade: Number(item.quantidade) || 0,
    validade: item.validade || null,
    funcionario: item.funcionario ?? null,
    data_bipagem: item.dataBipagem,
  };
  if (item.id) linha.id = item.id;
  return linha;
}

async function listarTodos() {
  const { data, error } = await client.from(TABELA).select("*");
  if (error) throw error;
  return (data || []).map(paraApp);
}

async function inserir(item) {
  const linha = paraBanco(item);
  const { data, error } = await client
    .from(TABELA)
    .insert(linha)
    .select()
    .single();
  if (error) throw error;
  return paraApp(data);
}

async function remover(id) {
  const { error } = await client.from(TABELA).delete().eq("id", id);
  if (error) throw error;
}

// usado quando um item já existente é editado (ex: corrigir a validade
// depois de lançado) — atualiza a linha em vez de tentar inserir de novo
async function atualizar(item) {
  const linha = paraBanco(item);
  delete linha.id; // não faz sentido tentar sobrescrever a chave primária
  // qualquer edição rearma a notificação — se a validade mudou, o item
  // precisa ser reavaliado pelo serviço de notificações
  linha.notificado = false;
  const { data, error } = await client
    .from(TABELA)
    .update(linha)
    .eq("id", item.id)
    .select()
    .single();
  if (error) throw error;
  return paraApp(data);
}

export const NeonDB = { listarTodos, inserir, remover, atualizar };

// também expõe no window, caso algum script clássico precise checar
// rapidinho se o módulo já carregou (ex: mostrar um aviso de "conectando...")
window.NeonDB = NeonDB;
