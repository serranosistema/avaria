/**
 * neon-client.js — instância única do cliente Neon (Data API).
 * -----------------------------------------------------------------
 * Módulo ES. Mantém a conexão com o banco.
 * O Auth agora serve apenas para pegar o token anônimo inicial
 * que permite consultar a tabela de usuários publicamente.
 * -----------------------------------------------------------------
 */
import { createClient } from "https://esm.sh/@neondatabase/neon-js";

const NEON_DATA_API_URL =
  "https://ep-wandering-fog-acw2usi8.apirest.sa-east-1.aws.neon.tech/neondb/rest/v1";
const NEON_AUTH_URL =
  "https://ep-wandering-fog-acw2usi8.neonauth.sa-east-1.aws.neon.tech/neondb/auth";

export const client = createClient({
  auth: {
    url: NEON_AUTH_URL,
    // ESSA É A MUDANÇA: Permite que o SDK conecte como "anonymous"
    // para conseguir ler a tabela de usuários e fazer o nosso login manual.
    allowAnonymous: true,
  },
  dataApi: {
    url: NEON_DATA_API_URL,
  },
});
