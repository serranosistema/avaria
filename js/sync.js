/**
 * sync.js — roda por trás das telas, sem travar nada.
 * -----------------------------------------------------------------
 * 1) Sobe pro Neon os itens que ainda estão só no localStorage
 *    (marcados como "sincronizado: false").
 * 2) Baixa os itens que outros aparelhos bipetaram e guarda no
 *    localStorage local (BVStorage.mesclarRemotos), pra aparecerem
 *    no painel/relatório desse aparelho também.
 *
 * Roda: ao abrir a página, quando a internet volta, e a cada alguns
 * minutos enquanto a página fica aberta.
 * -----------------------------------------------------------------
 */
import { NeonDB } from "./db.js";

let sincronizando = false;

// timestamp (ISO, vindo do próprio Neon) da última vez que a
// sincronização puxou dados com sucesso — assim as próximas rodadas só
// buscam o que mudou desde então, em vez da tabela inteira de novo
const CHAVE_ULTIMO_SYNC = "bv_ultimo_sync_em";

async function sincronizar() {
  if (sincronizando) return; // evita rodar duas vezes ao mesmo tempo
  if (!navigator.onLine) return;
  if (typeof BVStorage === "undefined") return; // storage-local.js ainda não carregou

  sincronizando = true;
  try {
    // 1) sobe o que só existe local ainda
    const pendentes = BVStorage.getPendentes();
    for (const item of pendentes) {
      try {
        if (item.pendenteAtualizacao) {
          await NeonDB.atualizar(item);
        } else {
          await NeonDB.inserir(item);
        }
        BVStorage.marcarSincronizado(item.id);
      } catch (err) {
        console.warn("[sync] falhou ao subir item", item.id, err);
        // deixa pendente — tenta de novo na próxima sincronização
      }
    }

    // 2) baixa só o que mudou desde a última sincronização (itens
    // novos de outros aparelhos OU itens editados em outro aparelho)
    const desde = localStorage.getItem(CHAVE_ULTIMO_SYNC) || undefined;
    const remotos = await NeonDB.listarTodos(desde);
    const alterados = BVStorage.mesclarRemotos(remotos);

    if (remotos.length > 0) {
      const maisRecente = remotos.reduce(
        (max, r) =>
          r.atualizadoEm && r.atualizadoEm > max ? r.atualizadoEm : max,
        desde || "",
      );
      if (maisRecente) localStorage.setItem(CHAVE_ULTIMO_SYNC, maisRecente);
    }

    if (alterados > 0) {
      console.info(
        `[sync] ${alterados} item(ns) novo(s)/atualizado(s) trazido(s) do banco`,
      );
      window.dispatchEvent(new CustomEvent("bv-dados-atualizados"));
    }
  } catch (err) {
    console.warn("[sync] erro geral de sincronização", err);
  } finally {
    sincronizando = false;
  }
}

// primeira sincronização ao abrir a página
window.addEventListener("load", sincronizar);

// assim que a internet voltar, sincroniza na hora
window.addEventListener("online", sincronizar);

// e de tempos em tempos, caso o app fique aberto muito tempo
setInterval(sincronizar, 2 * 60 * 1000); // a cada 2 minutos

// disponível globalmente também, pra chamar manualmente se quiser
// (ex: um botão "sincronizar agora" no futuro)
window.bvSincronizarAgora = sincronizar;
