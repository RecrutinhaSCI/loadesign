// src/middlewares/loginRateLimit.js
// ─────────────────────────────────────────────────────────────────────────────
// Limite de tentativas de login (em memória — o backend roda em uma instância).
//
// Conta apenas tentativas que FALHARAM (401). Duas janelas independentes:
//   - por IP + e-mail: LOGIN_MAX_PER_ACCOUNT falhas (padrão 5) em 15 min;
//   - por IP:          LOGIN_MAX_PER_IP falhas      (padrão 20) em 15 min.
// Ao atingir o limite, responde 429 com Retry-After. Um login bem-sucedido
// zera o contador daquele IP + e-mail. Nenhum dado sensível é registrado.
// ─────────────────────────────────────────────────────────────────────────────

const ApiError = require("../utils/ApiError");

function createLoginRateLimit({
  windowMs = 15 * 60 * 1000,
  maxPerAccount = Number(process.env.LOGIN_MAX_PER_ACCOUNT) || 5,
  maxPerIp = Number(process.env.LOGIN_MAX_PER_IP) || 20,
  now = () => Date.now(),
} = {}) {
  const hits = new Map(); // chave → { count, resetAt }

  const read = (key) => {
    const h = hits.get(key);
    if (!h) return null;
    if (h.resetAt <= now()) { hits.delete(key); return null; }
    return h;
  };
  const bump = (key) => {
    const h = read(key) || { count: 0, resetAt: now() + windowMs };
    h.count++;
    hits.set(key, h);
  };
  const prune = () => {
    if (hits.size < 1000) return;
    for (const [k, h] of hits) if (h.resetAt <= now()) hits.delete(k);
  };

  function middleware(req, res, next) {
    prune();
    const ip = req.ip || "desconhecido";
    const email = String((req.body && req.body.email) || "").toLowerCase().trim();
    const accountKey = `a:${ip}|${email}`;
    const ipKey = `i:${ip}`;

    const blocked = [read(accountKey), read(ipKey)].find((h, i) => h && h.count >= (i === 0 ? maxPerAccount : maxPerIp));
    if (blocked) {
      const retry = Math.max(1, Math.ceil((blocked.resetAt - now()) / 1000));
      res.set("Retry-After", String(retry));
      return next(new ApiError(429, `Muitas tentativas de login. Tente novamente em ${Math.ceil(retry / 60)} min.`));
    }

    res.on("finish", () => {
      if (res.statusCode === 401) { bump(accountKey); bump(ipKey); }
      else if (res.statusCode >= 200 && res.statusCode < 300) hits.delete(accountKey);
    });
    next();
  }

  middleware.reset = () => hits.clear();
  return middleware;
}

const loginRateLimit = createLoginRateLimit();

module.exports = { loginRateLimit, createLoginRateLimit };
