// src/config/prisma.js
// ─────────────────────────────────────────────────────────────────────────────
// Singleton do PrismaClient.
// Em desenvolvimento, evita múltiplas instâncias por hot-reload do nodemon.
// ─────────────────────────────────────────────────────────────────────────────

const { PrismaClient } = require("@prisma/client");
const env = require("./env");

const prismaClientSingleton = () => {
  return new PrismaClient({
    // Em testes, os erros esperados (404/409) já são verificados nas asserções.
    log: env.isDev ? ["query", "warn", "error"] : env.NODE_ENV === "test" ? [] : ["warn", "error"],
  });
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (env.isDev) {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
