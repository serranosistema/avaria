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

  function deleteItem(id) {
    const items = getItems().filter((i) => i.id !== id);
    saveItems(items);
  }

  function clearAll() {
    saveItems([]);
  }

  return {
    STORAGE_KEY,
    getItems,
    saveItems,
    addItem,
    updateItem,
    deleteItem,
    clearAll,
  };
})();
