/**
 * storage-local.js
 * -----------------------------------------------------------------
 * Camada de dados da Fase 1 (sem banco), tudo salvo no localStorage.
 *
 * Quando a Fase 2 (Firebase/Supabase) entrar, crie um "js/db.js" com
 * as MESMAS funções (getItems, addItem, updateItem, deleteItem), só
 * que lendo/gravando no banco em vez do localStorage. Aí troca só o
 * <script src="js/storage-local.js"> pelo <script src="js/db.js">
 * no HTML e o resto do app (painel.js) não precisa mudar nada.
 * -----------------------------------------------------------------
 */

const BVStorage = (() => {
  const STORAGE_KEY = "bv_itens";

  function getItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function addItem(item) {
    const items = getItems();
    const novo = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      corredor: item.corredor || "",
      codigo: item.codigo || "",
      descricao: item.descricao || "",
      quantidade: Number(item.quantidade) || 0,
      validade: item.validade || "",
      funcionario:
        item.funcionario || localStorage.getItem("bv_funcionario") || "",
      dataBipagem: new Date().toISOString(),
      sincronizado: false, // vira true quando o js/sync.js conseguir mandar pro Neon
    };
    items.push(novo);
    saveItems(items);
    return novo;
  }

  function updateItem(id, dadosAtualizados) {
    const items = getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...dadosAtualizados };
    saveItems(items);
    return items[idx];
  }

  // edição feita pelo usuário num item já lançado (ex: corrigir a validade).
  // Diferente de updateItem: marca o item pra ser ATUALIZADO no Neon no
  // próximo sync (e não inserido de novo, já que ele já existe lá).
  function editarItem(id, dadosAtualizados) {
    const items = getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = {
      ...items[idx],
      ...dadosAtualizados,
      sincronizado: false,
      pendenteAtualizacao: true,
    };
    saveItems(items);
    return items[idx];
  }

  function deleteItem(id) {
    const items = getItems().filter((i) => i.id !== id);
    saveItems(items);
  }

  function clearAll() {
    saveItems([]);
  }

  // ---------- Apoio à sincronização com o Neon (js/sync.js) ----------

  function getPendentes() {
    return getItems().filter((i) => !i.sincronizado);
  }

  function marcarSincronizado(id) {
    const items = getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      items[idx].sincronizado = true;
      delete items[idx].pendenteAtualizacao;
      saveItems(items);
    }
  }

  // mescla itens vindos do Neon com os locais: adiciona os que ainda
  // não existem aqui e ATUALIZA os que já existem mas mudaram em outro
  // aparelho (ex: alguém corrigiu a validade pelo celular do colega).
  // Com sincronização incremental, cada item recebido aqui já é, por
  // definição, algo que mudou desde a última checagem (novo ou editado).
  function mesclarRemotos(itensRemotos) {
    const locais = getItems();
    const porId = new Map(locais.map((i) => [i.id, i]));

    itensRemotos.forEach((remoto) => {
      porId.set(remoto.id, { ...remoto, sincronizado: true });
    });

    if (itensRemotos.length > 0) {
      saveItems([...porId.values()]);
    }
    return itensRemotos.length;
  }

  return {
    STORAGE_KEY,
    getItems,
    saveItems,
    addItem,
    updateItem,
    editarItem,
    deleteItem,
    clearAll,
    getPendentes,
    marcarSincronizado,
    mesclarRemotos,
  };
})();
