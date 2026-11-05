// src/config/dbGuard.js
// ─────────────────────────────────────────────────────────────────────────────
// Guard de banco de dados para ambientes NÃO produtivos.
//
// Objetivo: impedir que a API, o seed ou scripts locais se conectem por engano
// a um banco externo (ex.: o Neon de produção) durante desenvolvimento/testes.
//
// Regras (quando NODE_ENV !== "production"):
//   - DATABASE_URL precisa existir e ser uma URL postgres:// ou postgresql://.
//   - O host precisa estar numa ALLOWLIST: localhost, 127.0.0.1, ::1
//     + hosts aprovados explicitamente em DB_ALLOWED_HOSTS (separados por vírgula).
//   - Qualquer outro host é recusado — não depende de procurar "neon.tech".
//   - Parâmetro `?host=` na query (que sobrescreve o host no libpq) também é
//     verificado; sockets Unix (caminho começando com "/") são aceitos por
//     serem sempre locais.
//   - Mensagens de erro NUNCA incluem usuário, senha ou query string.
//
// Em produção (NODE_ENV === "production") o guard não é aplicado, preservando
// o comportamento atual do deploy.
//
// LIMITAÇÃO IMPORTANTE: este guard só protege código Node que o carrega
// (API, seed e scripts/db-guard-check.js). Comandos Prisma CLI executados
// diretamente (`npx prisma migrate ...`, `npx prisma db push`, `prisma studio`)
// NÃO passam por aqui. Use os scripts npm `db:*`, que chamam o check antes.
//
// Este módulo não tem dependências externas de propósito, para poder ser
// carregado antes de qualquer outra coisa.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];
const ALLOWED_PROTOCOLS = ["postgres:", "postgresql:"];

class DatabaseGuardError extends Error {
  constructor(message) {
    super(`[DB GUARD] ${message}`);
    this.name = "DatabaseGuardError";
  }
}

function normalizeHost(host) {
  return String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");
}

function parseAllowedHosts(raw) {
  const extra = String(raw || "")
    .split(",")
    .map(normalizeHost)
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_LOCAL_HOSTS, ...extra]));
}

/**
 * Descreve o destino sem credenciais nem query string.
 * Ex.: "localhost:5432/loadesign"
 */
function describeTarget(url) {
  const host = url.hostname || "(sem host)";
  const port = url.port ? `:${url.port}` : "";
  const db = url.pathname && url.pathname !== "/" ? url.pathname : "/(sem banco)";
  return `${host}${port}${db}`;
}

/**
 * Valida DATABASE_URL contra a allowlist de hosts locais.
 *
 * @param {object} opts
 * @param {string|undefined} opts.databaseUrl
 * @param {string|undefined} opts.nodeEnv
 * @param {string|undefined} [opts.allowedHostsRaw] - valor de DB_ALLOWED_HOSTS
 * @param {string} [opts.varName="DATABASE_URL"]   - nome usado nas mensagens
 * @returns {{ enforced: boolean, target: string|null }}
 * @throws {DatabaseGuardError}
 */
function assertSafeDatabaseUrl({
  databaseUrl,
  nodeEnv,
  allowedHostsRaw,
  varName = "DATABASE_URL",
}) {
  if (nodeEnv === "production") {
    return { enforced: false, target: null };
  }

  if (!databaseUrl || !String(databaseUrl).trim()) {
    throw new DatabaseGuardError(`${varName} não definida. Configure o .env local (veja .env.example).`);
  }

  let url;
  try {
    url = new URL(String(databaseUrl).trim());
  } catch {
    // Não ecoa o valor: pode conter senha.
    throw new DatabaseGuardError(`${varName} inválida (não é uma URL válida).`);
  }

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new DatabaseGuardError(
      `${varName} precisa usar postgresql:// (protocolo recebido: "${url.protocol}").`
    );
  }

  const allowed = parseAllowedHosts(allowedHostsRaw);
  const host = normalizeHost(url.hostname);

  if (!host) {
    throw new DatabaseGuardError(`${varName} sem host definido.`);
  }

  if (!allowed.includes(host)) {
    throw new DatabaseGuardError(
      `Conexão recusada ao host "${host}" fora de produção (NODE_ENV="${nodeEnv || "(vazio)"}"). ` +
      `Hosts permitidos: ${allowed.join(", ")}. ` +
      `Para aprovar outro destino LOCAL, adicione-o em DB_ALLOWED_HOSTS.`
    );
  }

  // `?host=` sobrescreve o host da URL no libpq/Prisma.
  for (const qhostRaw of url.searchParams.getAll("host")) {
    const qhost = normalizeHost(qhostRaw);
    if (qhost.startsWith("/")) continue; // socket Unix → sempre local
    if (!allowed.includes(qhost)) {
      throw new DatabaseGuardError(
        `Parâmetro "host" na query de ${varName} aponta para "${qhost}", que não está na allowlist.`
      );
    }
  }

  return { enforced: true, target: describeTarget(url) };
}

/**
 * Aplica o guard usando process.env. Valida DATABASE_URL e, se existirem,
 * DIRECT_URL e SHADOW_DATABASE_URL (usadas por alguns fluxos do Prisma).
 *
 * @param {object} [env=process.env]
 * @param {object} [opts]
 * @param {boolean} [opts.alwaysEnforce=false] - aplica o guard mesmo com
 *   NODE_ENV=production. Usado por ferramentas de manutenção locais (seed,
 *   scripts db:*), que nunca devem rodar contra um banco externo.
 */
function assertSafeDatabaseEnv(env = process.env, { alwaysEnforce = false } = {}) {
  const nodeEnv = alwaysEnforce ? "maintenance" : env.NODE_ENV;

  const result = assertSafeDatabaseUrl({
    databaseUrl: env.DATABASE_URL,
    nodeEnv,
    allowedHostsRaw: env.DB_ALLOWED_HOSTS,
  });

  for (const varName of ["DIRECT_URL", "SHADOW_DATABASE_URL"]) {
    if (env[varName]) {
      assertSafeDatabaseUrl({
        databaseUrl: env[varName],
        nodeEnv,
        allowedHostsRaw: env.DB_ALLOWED_HOSTS,
        varName,
      });
    }
  }

  return result;
}

/**
 * Extrai host, porta e nome do banco de uma URL, sem credenciais.
 * Retorna null se a URL for ausente ou inválida.
 */
function parseDatabaseTarget(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    const url = new URL(String(databaseUrl).trim());
    return {
      host: normalizeHost(url.hostname),
      port: url.port || null,
      database: decodeURIComponent((url.pathname || "").replace(/^\//, "")) || null,
      description: describeTarget(url),
    };
  } catch {
    return null;
  }
}

module.exports = {
  parseDatabaseTarget,
  assertSafeDatabaseUrl,
  assertSafeDatabaseEnv,
  DatabaseGuardError,
  DEFAULT_LOCAL_HOSTS,
};
