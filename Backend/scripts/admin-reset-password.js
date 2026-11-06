#!/usr/bin/env node
// scripts/admin-reset-password.js
// ─────────────────────────────────────────────────────────────────────────────
// Redefinição administrativa PONTUAL da senha do único usuário ADMIN, sem usar
// a senha antiga e sem depender de sessão do painel (contenção de incidente).
//
//   node scripts/admin-reset-password.js plan              → somente leitura
//   node scripts/admin-reset-password.js reset --execute   → grava a nova senha
//
// Credencial: Backend/.env.migrate (MIGRATE_DATABASE_URL / MIGRATE_CONFIRM_HOST /
// MIGRATE_EXPECTED_BRANCH), a mesma da Fase D, preenchida pela responsável.
//
// Garantias:
//  - a nova senha é digitada no terminal (oculta, duas vezes); nunca vem de
//    argumento, variável de ambiente ou arquivo, e nunca é impressa;
//  - o hash bcrypt é calculado localmente e não é impresso nem salvo;
//  - nenhuma senha ou hash existente é lido: as consultas selecionam só
//    id, e-mail, papel, ativo e datas;
//  - identidade confirmada antes de gravar: host, banco, branch Neon, endpoint
//    direto, SSL; exatamente 1 usuário, papel ADMIN, ativo;
//  - a gravação é condicionada ao id E ao updatedAt lidos no plano (se o
//    registro mudou no meio, nada é gravado) e precisa afetar exatamente 1 linha;
//  - erros são mascarados (nenhuma URL/credencial nas mensagens).
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");

const BACKEND = path.resolve(__dirname, "..");
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];
const BCRYPT_COST = 12;
const MIN_LENGTH = 16;
// SHA-256 de senhas de demonstração já publicadas (a senha em si não fica no código).
const KNOWN_FINGERPRINTS = new Set(["240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"]);

const log = (m) => console.log(`[RESET] ${m}`);
class Stop extends Error {}
const stop = (m) => { throw new Stop(m); };
const mask = (s) => String(s).replace(/postgres(?:ql)?:\/\/\S+/gi, "<url>").replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, "<hash>");
const maskEmail = (e) => { const [u, d] = String(e).split("@"); return `${u.slice(0, 2)}***@${d}`; };

/** Valida a credencial e devolve URLs de escrita e somente leitura. Pura (testável). */
function parseTarget(env, { envFile, allowLocal } = {}) {
  let u;
  try { u = new URL(env.MIGRATE_DATABASE_URL); } catch { stop("MIGRATE_DATABASE_URL ausente ou inválida."); }
  const host = u.hostname.toLowerCase();
  const local = LOCAL_HOSTS.includes(host);
  if (!env.MIGRATE_CONFIRM_HOST || env.MIGRATE_CONFIRM_HOST.trim().toLowerCase() !== host) stop("MIGRATE_CONFIRM_HOST não confere com o host da URL.");
  if (!env.MIGRATE_EXPECTED_BRANCH) stop("MIGRATE_EXPECTED_BRANCH não definido.");
  if (/-pooler\b/.test(host)) stop("endpoint POOLER não é permitido — use o endpoint direto.");
  if (local && !allowLocal) stop("host local só é aceito em ensaio (RESET_ENV_FILE).");
  if (!local && envFile) stop("RESET_ENV_FILE só é aceito em ensaio local.");
  if (!u.password) stop("URL sem senha.");
  u.searchParams.delete("channel_binding");
  if (!local) u.searchParams.set("sslmode", "require");
  if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "30");
  const ro = new URL(u.toString());
  ro.searchParams.set("options", "-c default_transaction_read_only=on");
  return { url: u.toString(), roUrl: ro.toString(), host, local, database: u.pathname.slice(1).split("?")[0], branch: env.MIGRATE_EXPECTED_BRANCH.trim() };
}

/** Política da nova senha. Devolve lista de problemas (vazia = aceita). Pura (testável). */
function passwordProblems(pw, { email } = {}) {
  const p = [];
  if (typeof pw !== "string" || pw.length < MIN_LENGTH) p.push(`mínimo de ${MIN_LENGTH} caracteres`);
  if (pw && pw.length > 72) p.push("máximo de 72 caracteres (limite do bcrypt)");
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(pw || "")).length;
  if (classes < 3) p.push("use ao menos 3 tipos: minúsculas, maiúsculas, números, símbolos");
  if (pw && pw.trim() !== pw) p.push("sem espaços no início ou no fim");
  const low = String(pw || "").toLowerCase();
  if (["loadesign", "admin", "senha", "password"].some((w) => low.includes(w))) p.push("não use nome da empresa, 'admin' ou 'senha'");
  if (email && low.includes(String(email).split("@")[0].toLowerCase())) p.push("não use o e-mail");
  if (KNOWN_FINGERPRINTS.has(crypto.createHash("sha256").update(String(pw || "")).digest("hex"))) p.push("senha de demonstração conhecida");
  return p;
}

/** Confere a identidade e o alvo único. Pura (testável). */
function assertTarget(target, s) {
  if (s.ro !== "on") stop("sessão de leitura não ficou READ ONLY.");
  if (s.database !== target.database) stop(`banco conectado inesperado (${s.database}).`);
  if (!target.local && s.branch !== target.branch) stop("branch Neon conectado diferente do esperado.");
  if (s.users.length !== 1) stop(`esperado exatamente 1 usuário; encontrados ${s.users.length}.`);
  const u = s.users[0];
  if (String(u.role).toUpperCase() !== "ADMIN") stop("o único usuário não tem papel ADMIN.");
  if (!u.active) stop("o único usuário está inativo.");
  return u;
}

async function readState(target) {
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: target.roUrl } } });
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const [{ ro }] = await tx.$queryRawUnsafe("SELECT current_setting('transaction_read_only') AS ro");
      const [id] = await tx.$queryRawUnsafe("SELECT current_database() AS database, current_setting('neon.branch_id', true) AS branch, current_user AS who");
      // Colunas explícitas: a senha NÃO é selecionada.
      const users = await tx.$queryRawUnsafe(`SELECT id, email, role, active, "updatedAt" FROM users ORDER BY "createdAt"`);
      return { ro, ...id, users };
    });
  } finally { await db.$disconnect(); }
}

function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Stop("execute em um terminal interativo (a senha é digitada por você)."));
    process.stdout.write(prompt);
    const stdin = process.stdin;
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const finish = () => { stdin.setRawMode(false); stdin.pause(); stdin.removeListener("data", onData); process.stdout.write("\n"); };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") { finish(); return resolve(value); }
        if (ch === "\u0003") { finish(); process.exit(130); }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else if (ch >= " ") value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

function askLine(prompt) {
  return new Promise((resolve) => {
    const rl = require("readline").createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (a) => { rl.close(); resolve(a.trim()); });
  });
}

function loadTarget() {
  const envFile = process.env.RESET_ENV_FILE || null;
  const file = envFile || path.join(BACKEND, ".env.migrate");
  if (!fs.existsSync(file)) stop(`${path.basename(file)} não encontrado.`);
  return parseTarget(dotenv.parse(fs.readFileSync(file)), { envFile, allowLocal: Boolean(envFile) });
}

function describe(target, s, u) {
  log(`destino: ${target.host}/${s.database}${target.local ? " (ENSAIO LOCAL)" : ` · branch ${s.branch}`} · sessão de leitura: READ ONLY`);
  log(`usuário alvo: id ${String(u.id).slice(0, 4)}… · ${maskEmail(u.email)} · ${u.role} · ativo · atualizado em ${new Date(u.updatedAt).toISOString()}`);
}

async function cmdPlan() {
  const target = loadTarget();
  const s = await readState(target);
  const u = assertTarget(target, s);
  describe(target, s, u);
  log("PLANO OK — nada foi gravado.");
}

async function cmdReset() {
  if (!process.argv.includes("--execute")) stop("uso: reset --execute");
  const target = loadTarget();
  const s = await readState(target);
  const u = assertTarget(target, s);
  describe(target, s, u);

  const pw1 = await askHidden("Nova senha (oculta): ");
  const problems = passwordProblems(pw1, { email: u.email });
  if (problems.length) stop(`senha recusada: ${problems.join("; ")}.`);
  const pw2 = await askHidden("Repita a nova senha: ");
  if (pw1 !== pw2) stop("as senhas não conferem.");

  const answer = await askLine(`Digite REDEFINIR para gravar a nova senha de ${maskEmail(u.email)}: `);
  if (answer !== "REDEFINIR") stop("confirmação não recebida — nada foi gravado.");

  const bcrypt = require("bcryptjs");
  const hash = await bcrypt.hash(pw1, BCRYPT_COST);

  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: target.url } } });
  let count;
  try {
    // Condicionada ao id e ao updatedAt lidos acima; só a coluna de senha muda
    // (o Prisma atualiza updatedAt automaticamente).
    ({ count } = await db.user.updateMany({ where: { id: u.id, updatedAt: u.updatedAt, active: true }, data: { password: hash } }));
  } finally { await db.$disconnect(); }
  if (count !== 1) stop(`nenhuma alteração aplicada (linhas afetadas: ${count}). O registro mudou ou não confere — rode "plan" de novo.`);

  const after = assertTarget(target, await readState(target));
  if (!(new Date(after.updatedAt) > new Date(u.updatedAt))) stop("gravação não confirmada pela releitura — verificar manualmente.");
  log(`SENHA REDEFINIDA · 1 linha · updatedAt ${new Date(u.updatedAt).toISOString()} → ${new Date(after.updatedAt).toISOString()}`);
  log("Próximo passo: login manual no painel com a nova senha; depois, rotação do JWT_SECRET no Render.");
}

if (require.main === module) {
  const cmd = process.argv[2];
  const map = { plan: cmdPlan, reset: cmdReset };
  Promise.resolve()
    .then(() => (map[cmd] ? map[cmd]() : stop("uso: plan | reset --execute")))
    .catch((e) => {
      console.error(`[RESET] ⛔ PARADA: ${mask(e && e.message ? e.message : e)}`);
      process.exit(e instanceof Stop ? 2 : 1);
    });
}

module.exports = { parseTarget, passwordProblems, assertTarget, mask, KNOWN_FINGERPRINTS };
