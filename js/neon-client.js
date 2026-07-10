/**
 * neon-client.js — instância única do cliente Neon (Auth + Data API).
 * -----------------------------------------------------------------
 * Módulo ES (por isso os <script type="module"> que vão usar isso).
 * Tanto o js/auth.js (login/sessão) quanto o js/db.js (leitura/gravação
 * de itens) importam o "client" daqui, pra não criar duas conexões
 * separadas com configurações que podem divergir.
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
    // sem cadastro público — só o usuário criado manualmente no Console
    // (Auth → Create user) consegue logar
    allowAnonymous: false,
  },
  dataApi: {
    url: NEON_DATA_API_URL,
  },
});
