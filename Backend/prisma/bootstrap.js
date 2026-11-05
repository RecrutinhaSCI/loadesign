// prisma/bootstrap.js
// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP INICIAL — NÃO DESTRUTIVO
//
// Prepara um banco recém-criado com o mínimo para o painel funcionar:
//   1) AgencySettings (singleton) — criado apenas se não existir.
//   2) Primeiro usuário admin — criado apenas se NÃO houver nenhum usuário.
//
// Garantias:
//   - Nunca apaga, nunca atualiza registros existentes (sem deleteMany/update).
//   - Nenhuma senha fixa: e-mail e senha vêm de BOOTSTRAP_ADMIN_EMAIL e
//     BOOTSTRAP_ADMIN_PASSWORD; a senha nunca é impressa.
//   - Falha de forma segura se faltar configuração.
//   - Nesta fase, só roda contra banco local/aprovado (guard sempre aplicado).
//     Uso em produção exigirá autorização e ajuste explícitos.
//
// Uso:  npm run db:bootstrap
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const { assertSafeDatabaseEnv, parseDatabaseTarget } = require("../src/config/dbGuard");

function fail(msg) {
  console.error(`[BOOTSTRAP] ${msg}`);
  process.exit(1);
}

try {
  assertSafeDatabaseEnv(process.env, { alwaysEnforce: true });
} catch (err) {
  fail(err.message);
}

const ADMIN_EMAIL = String(process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
const ADMIN_NAME = String(process.env.BOOTSTRAP_ADMIN_NAME || "Administradora").trim();

if (!ADMIN_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL)) {
  fail("Defina BOOTSTRAP_ADMIN_EMAIL com um e-mail válido.");
}
if (ADMIN_PASSWORD.length < 12) {
  fail("Defina BOOTSTRAP_ADMIN_PASSWORD com no mínimo 12 caracteres.");
}

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const SETTINGS_DEFAULTS = {
  id: "singleton",
  name: "Loa Design",
  email: "loadesigndigital@gmail.com",
  whatsapp: "555499481393",
  instagram: "@loadesigndigital",
  website: "https://loadesign.com.br",
  ownerName: "Loa",
  ownerEmail: "loadesigndigital@gmail.com",
};

async function main() {
  const target = parseDatabaseTarget(process.env.DATABASE_URL);
  console.log(`[BOOTSTRAP] Destino: ${target ? target.description : "(desconhecido)"}`);

  // 1) AgencySettings — create-only
  const settings = await prisma.agencySettings.findUnique({ where: { id: "singleton" } });
  if (settings) {
    console.log("[BOOTSTRAP] AgencySettings já existe — mantido.");
  } else {
    await prisma.agencySettings.create({ data: SETTINGS_DEFAULTS });
    console.log("[BOOTSTRAP] AgencySettings criado.");
  }

  // 2) Primeiro admin — somente se não houver nenhum usuário
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`[BOOTSTRAP] Já existem ${userCount} usuário(s) — nenhum admin criado, nenhuma senha alterada.`);
  } else {
    await prisma.user.create({
      data: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: await bcrypt.hash(ADMIN_PASSWORD, 12),
        role: "ADMIN",
        active: true,
      },
    });
    console.log(`[BOOTSTRAP] Admin inicial criado: ${ADMIN_EMAIL} (senha não exibida).`);
  }
}

main()
  .catch((e) => {
    console.error("[BOOTSTRAP] Falhou:", e && e.message ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
