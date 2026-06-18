// src/config/env.js
// ─────────────────────────────────────────────────────────────────────────────
// Centraliza e valida todas as variáveis de ambiente.
// Em produção, falha rápido se JWT_SECRET for fraco ou ausente.
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[ENV] Variável de ambiente obrigatória não definida: ${key}`);
  }
  return value;
}

function optional(key, fallback = undefined) {
  return process.env[key] ?? fallback;
}

const NODE_ENV = optional("NODE_ENV", "development");
const isProd = NODE_ENV === "production";

// CORS_ORIGIN aceita múltiplas origens separadas por vírgula:
// CORS_ORIGIN="http://localhost:5173,http://localhost:5174,https://loa.app"
const corsRaw = optional("CORS_ORIGIN", "http://localhost:5173,http://localhost:5174");
const CORS_ORIGINS = corsRaw.split(",").map((s) => s.trim()).filter(Boolean);

// ── JWT — validação rígida em produção ──────────────────────────────────────
const JWT_SECRET = isProd
  ? required("JWT_SECRET")
  : optional("JWT_SECRET", "dev_secret_change_in_production");

const WEAK_SECRETS = [
  "dev_secret_change_in_production",
  "dev_secret_loa_design_local_apenas_TROCAR_EM_PROD",
  "sua_chave_super_secreta",
  "TROQUE_ESTA_CHAVE_em_producao_use_random_de_64_bytes_em_hex",
];

if (isProd) {
  if (WEAK_SECRETS.includes(JWT_SECRET) || JWT_SECRET.length < 32) {
    throw new Error(
      "[ENV] JWT_SECRET fraco ou padrão em produção. " +
      "Gere com: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }
}

const env = {
  NODE_ENV,
  PORT:   parseInt(optional("PORT", "3333"), 10),
  isDev:  NODE_ENV === "development",
  isProd,

  DATABASE_URL: required("DATABASE_URL"),

  CORS_ORIGINS,
  FRONTEND_URL: CORS_ORIGINS[0],  // legado

  JWT_SECRET,
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "7d"),
};

module.exports = env;
