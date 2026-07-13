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

// tamanho do bloco de paginação — evita trazer a tabela inteira numa
// única requisição gigante conforme o catálogo cresce
const TAMANHO_PAGINA = 500;

// colunas que o app realmente usa — evita puxar dados extras (ex: a
// coluna "notificado", que só a função de notificações usa)
const COLUNAS =
  "id,corredor,codigo,descricao,quantidade,validade,funcionario,data_bipagem,atualizado_em";

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
    atualizadoEm: row.atualizado_em,
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

// busca os itens em blocos de TAMANHO_PAGINA, em vez de tudo numa
// requisição só. Se "desde" for passado (timestamp ISO), traz só o
// que mudou depois dele — usado pra sincronização incremental.
async function listarTodos(desde) {
  const todos = [];
  let inicio = 0;

  while (true) {
    let query = client
      .from(TABELA)
      .select(COLUNAS)
      .order("atualizado_em", { ascending: true })
      .range(inicio, inicio + TAMANHO_PAGINA - 1);

    if (desde) query = query.gt("atualizado_em", desde);

    const { data, error } = await query;
    if (error) throw error;

    const pagina = data || [];
    todos.push(...pagina);

    if (pagina.length < TAMANHO_PAGINA) break; // última página
    inicio += TAMANHO_PAGINA;
  }

  return todos.map(paraApp);
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
