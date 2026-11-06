// src/utils/jwt.js
// ─────────────────────────────────────────────────────────────────────────────
// Wrapper fino sobre jsonwebtoken usando a config centralizada.
//
// Versão de sessão ("sv"): cada token carrega uma impressão HMAC derivada do
// hash de senha atual do usuário. Quando a senha muda, o hash muda e TODOS os
// tokens emitidos antes deixam de ser aceitos por requireAuth — sem tabela de
// sessões e sem migration. A impressão não permite recuperar o hash (HMAC com
// o JWT_SECRET, truncado) e não contém dado pessoal.
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function sessionVersion(passwordHash) {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(`sv:${passwordHash}`).digest("base64url").slice(0, 22);
}

function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN, algorithm: "HS256" });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
}

/** Comparação em tempo constante da versão de sessão. */
function sessionVersionMatches(tokenSv, passwordHash) {
  if (typeof tokenSv !== "string" || !passwordHash) return false;
  const a = Buffer.from(tokenSv);
  const b = Buffer.from(sessionVersion(passwordHash));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { signAccessToken, verifyAccessToken, sessionVersion, sessionVersionMatches };
