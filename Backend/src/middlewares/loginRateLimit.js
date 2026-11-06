// src/middlewares/loginRateLimit.js
// ─────────────────────────────────────────────────────────────────────────────
// Limite de tentativas de login (em memória — o backend roda em uma instância).
//
// Conta apenas tentativas que FALHARAM (401). Dois contadores INDEPENDENTES:
//   - por conta (e-mail normalizado): LOGIN_MAX_PER_ACCOUNT falhas (padrão 5)
//     em 15 min — não depende do IP, então trocar de IP/proxy não contorna;
//   - por IP do cliente: LOGIN_MAX_PER_IP falhas (padrão 20) em 15 min —
//     só quando há um IP público confiável (utils/clientIp). Sem ele, o limite
//     por IP é suspenso para não bloquear todos atrás do mesmo proxy.
// Ao atingir qualquer limite: 429 com Retry-After (inclusive com a senha certa,
// para não servir de oráculo). Login bem-sucedido zera o contador da conta.
// Nenhum dado sensível é registrado (o diagnóstico registra só o formato da
// cadeia de proxies, sem endereços).
// ─────────────────────────────────────────────────────────────────────────────

const ApiError = require("../utils/ApiError");
const { clientIpOf, chainShape } = require("../utils/clientIp");

const MAX_KEYS = 10_000;

function createLoginRateLimit({
  windowMs = 15 * 60 * 1000,
  maxPerAccount = Number(process.env.LOGIN_MAX_PER_ACCOUNT) || 5,
  maxPerIp = Number(process.env.LOGIN_MAX_PER_IP) || 20,
  now = () => Date.now(),
  onDiagnostic = null,
  diagnosticSamples = 5,
} = {}) {
  const hits = new Map(); // chave → { count, resetAt }
  let samples = 0;

  const read = (key) => {
    const h = hits.get(key);
    if (!h) return null;
    if (h.resetAt <= now()) { hits.delete(key); return null; }
    return h;
  };
  const bump = (key) => {
    const h = read(key) || { count: 0, resetAt: now() + windowMs };
    h.count++;
    hits.delete(key); // reinsere no fim (ordem = mais recente)
    hits.set(key, h);
    if (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value); // descarta o mais antigo
  };
  const prune = () => {
    if (hits.size < 1000) return;
    for (const [k, h] of hits) if (h.resetAt <= now()) hits.delete(k);
  };

  function middleware(req, res, next) {
    prune();
    const email = String((req.body && req.body.email) || "").toLowerCase().trim().slice(0, 200);
    const ip = clientIpOf(req);
    const accountKey = email ? `a:${email}` : null;
    const ipKey = ip ? `i:${ip}` : null;

    if (onDiagnostic && samples < diagnosticSamples) {
      samples++;
      onDiagnostic({ chain: chainShape(req), ipResolved: Boolean(ip) });
    }

    const checks = [[accountKey, maxPerAccount], [ipKey, maxPerIp]];
    for (const [key, max] of checks) {
      const h = key && read(key);
      if (h && h.count >= max) {
        const retry = Math.max(1, Math.ceil((h.resetAt - now()) / 1000));
        res.set("Retry-After", String(retry));
        return next(new ApiError(429, `Muitas tentativas de login. Tente novamente em ${Math.ceil(retry / 60)} min.`));
      }
    }

    res.on("finish", () => {
      if (res.statusCode === 401) {
        if (accountKey) bump(accountKey);
        if (ipKey) bump(ipKey);
      } else if (res.statusCode >= 200 && res.statusCode < 300 && accountKey) {
        hits.delete(accountKey);
      }
    });
    next();
  }

  middleware.reset = () => { hits.clear(); samples = 0; };
  return middleware;
}

// Diagnóstico de produção: formato da cadeia (ex.: "P,I,I" = cliente público +
// 2 proxies internos) nas primeiras requisições de login após cada início.
const logger = require("../utils/logger");
const loginRateLimit = createLoginRateLimit({
  onDiagnostic: ({ chain, ipResolved }) => logger.info(`[LOGIN LIMIT] cadeia de proxies: ${chain} · IP do cliente identificado: ${ipResolved ? "sim" : "não"}`),
});

module.exports = { loginRateLimit, createLoginRateLimit };
