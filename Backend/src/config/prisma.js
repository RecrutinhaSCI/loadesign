// src/config/prisma.js
// ─────────────────────────────────────────────────────────────────────────────
// Singleton do PrismaClient.
// Em desenvolvimento, evita múltiplas instâncias por hot-reload do nodemon.
// ─────────────────────────────────────────────────────────────────────────────

const { PrismaClient } = require("@prisma/client");
const env = require("./env");

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: env.isDev ? ["query", "warn", "error"] : ["warn", "error"],
  });
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (env.isDev) {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
