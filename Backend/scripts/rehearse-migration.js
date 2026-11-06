#!/usr/bin/env node
// scripts/rehearse-migration.js
// ─────────────────────────────────────────────────────────────────────────────
// ENSAIO LOCAL da sequência de migração de produção, num schema isolado
// ("migration_rehearsal") do banco loadesign_test. Nunca conecta fora do host
// local (guard dos testes + executor prisma-safe).
//
// Reproduz exatamente o que será feito no Neon:
//   1) estrutura legada existente (simulada com 0_baseline) + dados sintéticos;
//   2) `migrate resolve --applied 0_baseline` (marca o legado, não executa);
//   3) `migrate deploy` (aplica só a migração aditiva);
//   4) verificações: migrations em dia, schema idêntico ao Prisma,
//      dados legados byte a byte iguais (md5 por tabela), API funcional.
//
// Uso: node scripts/rehearse-migration.js
// O schema de ensaio é recriado a cada execução (somente no loadesign_test).
// ─────────────────────────────────────────────────────────────────────────────

const path = require("path");
const { spawnSync } = require("child_process");
const { loadTestEnv } = require("../tests/support/testEnv");

const SCHEMA = "migration_rehearsal";
const BACKEND = path.resolve(__dirname, "..");
const LEGACY = ["users", "leads", "clients", "projects", "services", "quotes", "transactions", "agency_settings", "testimonials", "portfolio_items", "contact_messages"];

const { env: baseEnv } = loadTestEnv();
const url = new URL(baseEnv.DATABASE_URL);
url.searchParams.set("schema", SCHEMA);
const env = { ...baseEnv, DATABASE_URL: url.toString(), PRISMA_PROD_CONFIRM_HOST: url.hostname };

function prisma(...args) {
  const r = spawnSync(process.execPath, ["scripts/prisma-safe.js", ...args], { cwd: BACKEND, env, encoding: "utf8" });
  const out = `${r.stdout}${r.stderr}`.replace(/postgres(ql)?:\/\/[^\s"']+/g, "postgresql://***");
  return { status: r.status, out };
}
const step = (msg) => console.log(`\n▶ ${msg}`);
const fail = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };

async function main() {
  // Client apontando para o schema de ensaio
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.NODE_ENV = "test";
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });

  const [{ d }] = await db.$queryRawUnsafe("SELECT current_database() AS d");
  if (d !== "loadesign_test") fail(`banco inesperado: ${d}`);

  step(`Recriando schema isolado "${SCHEMA}" em loadesign_test`);
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
  await db.$executeRawUnsafe(`CREATE SCHEMA "${SCHEMA}"`);

  step("1) Simulando produção: estrutura legada (0_baseline) + dados sintéticos");
  let r = prisma("db", "execute", "--schema", "prisma/schema.prisma", "--file", "prisma/migrations/0_baseline/migration.sql");
  if (r.status !== 0) fail(r.out);
  await db.user.create({ data: { name: "Laura (sintética)", email: "laura@example.test", password: "$2a$10$hashsinteticohashsinteticohashsinteticohashsintetic", role: "ADMIN" } });
  const client = await db.client.create({ data: { name: "Cliente Legado", email: "c@example.test", phone: "54900000001" } });
  await db.lead.create({ data: { name: "Lead Legado", email: "l@example.test", phone: "54900000002", tags: '["site"]', clientId: client.id } });
  await db.project.create({ data: { name: "Projeto Legado", deadline: new Date("2026-12-01T00:00:00Z"), clientName: client.name, clientId: client.id, value: 1500 } });
  await db.quote.create({ data: { clientName: "Cliente Legado", validUntil: new Date("2026-12-31T00:00:00Z"), items: '[{"description":"x","quantity":1,"unitPrice":100}]', discount: 10, total: 90, clientId: client.id } });
  await db.transaction.create({ data: { description: "Receita legada", type: "income", value: 1234.56, date: new Date("2026-10-01T00:00:00Z") } });
  await db.service.create({ data: { name: "Pacote legado", slug: "pacote-legado", description: "d", price: 999 } });
  await db.agencySettings.create({ data: { name: "Loa", email: "a@example.test", whatsapp: "1", instagram: "@x", website: "https://x.test", ownerName: "L", ownerEmail: "a@example.test" } });
  await db.testimonial.create({ data: { name: "T", role: "R", text: "ok" } });
  await db.portfolioItem.create({ data: { title: "P", client: "C", imageUrl: "https://x.test/i.png" } });
  await db.contactMessage.create({ data: { name: "M", phone: "1", message: "oi" } });

  const snapshot = async () => {
    const out = {};
    for (const t of LEGACY) {
      const [{ n, h }] = await db.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS n, md5(COALESCE(string_agg(t::text, '|' ORDER BY t::text), '')) AS h FROM "${SCHEMA}"."${t}" t`
      );
      out[t] = `${n}:${h}`;
    }
    return out;
  };
  const before = await snapshot();

  step("2) migrate resolve --applied 0_baseline (marca o legado como existente)");
  r = prisma("migrate", "resolve", "--applied", "0_baseline");
  if (r.status !== 0) fail(r.out);

  step("3) migrate deploy (aplica somente a migração aditiva)");
  r = prisma("migrate", "deploy");
  if (r.status !== 0) fail(r.out);
  console.log(r.out.split("\n").filter((l) => /migration|Applying|applied/i.test(l)).join("\n"));

  step("4a) migrate status");
  r = prisma("migrate", "status");
  if (r.status !== 0 || !/up to date/i.test(r.out)) fail(r.out);
  console.log("   migrations em dia");

  step("4b) schema do banco idêntico ao schema.prisma (diff vazio)");
  r = prisma("migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code");
  if (r.status !== 0) fail(`diferenças encontradas:\n${r.out}`);
  console.log("   nenhuma diferença");

  step("4c) dados legados preservados (contagem + md5 por tabela)");
  const after = await snapshot();
  for (const t of LEGACY) {
    if (before[t] !== after[t]) fail(`${t} alterada: ${before[t]} → ${after[t]}`);
    console.log(`   ${t}: ${after[t].split(":")[0]} linha(s), idêntica`);
  }

  step("4d) segunda execução de deploy é inofensiva (idempotência)");
  r = prisma("migrate", "deploy");
  if (r.status !== 0 || !/No pending migrations/i.test(r.out)) fail(r.out);
  console.log("   nada pendente");

  step("4e) fluxo novo funcional sobre a estrutura migrada");
  const contact = await db.contact.create({ data: { name: "Novo", phone: "54911112222", phoneNormalized: "54911112222" } });
  const proposal = await db.proposal.create({ data: { contactId: contact.id, contactName: "Novo", contactPhone: "54911112222", title: "Teste" } });
  const project = await db.workProject.create({ data: { contactId: contact.id, proposalId: proposal.id, name: "P", serviceName: "S", contractedValue: "100.00", paymentMode: "ONE_TIME" } });
  await db.receivable.create({ data: { contactId: contact.id, projectId: project.id, kind: "ONE_TIME", installmentNumber: 1, installmentCount: 1, description: "x", amount: "100.00", dueDate: new Date("2027-01-10T00:00:00Z") } });
  let dupBlocked = false;
  try {
    await db.workProject.create({ data: { contactId: contact.id, proposalId: proposal.id, name: "dup", serviceName: "S", contractedValue: "1", paymentMode: "ONE_TIME" } });
  } catch (e) { dupBlocked = e.code === "P2002"; }
  if (!dupBlocked) fail("constraint de projeto único por orçamento não atuou");
  console.log("   escrita nas tabelas novas OK; unicidade projeto/orçamento OK");
  const legacyAfterNew = await snapshot();
  for (const t of LEGACY) if (legacyAfterNew[t] !== before[t]) fail(`${t} alterada pelo fluxo novo`);
  console.log("   legado intacto após uso do fluxo novo");

  await db.$disconnect();
  console.log("\n✔ ENSAIO APROVADO");
}

main().catch((e) => fail(String(e && e.message ? e.message : e).replace(/postgres(ql)?:\/\/[^\s"']+/g, "postgresql://***")));
