// src/server.js
// ─────────────────────────────────────────────────────────────────────────────
// Ponto de entrada da aplicação Express.
// Configura middlewares globais, rotas e inicia o servidor.
// ─────────────────────────────────────────────────────────────────────────────

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");

const env          = require("./config/env");
const prisma       = require("./config/prisma");
const logger       = require("./utils/logger");
const routes       = require("./routes/index");
const notFound     = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// ── Segurança ─────────────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Request logging ───────────────────────────────────────────────────────────
if (env.isDev) {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// ── Rotas ────────────────────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use(notFound);

// ── Error handler global ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Inicialização ─────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info("✅ Banco de dados conectado.");

    app.listen(env.PORT, () => {
      logger.info(`🚀 Servidor rodando em http://localhost:${env.PORT}`);
      logger.info(`   Ambiente: ${env.NODE_ENV}`);
      logger.info(`   Frontend permitido: ${env.FRONTEND_URL}`);
    });
  } catch (err) {
    logger.error("❌ Falha ao iniciar o servidor:", err);
    process.exit(1);
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() {
  logger.info("🛑 Encerrando servidor...");
  await prisma.$disconnect();
  process.exit(0);
}

bootstrap();

module.exports = app; // exportado para testes futuros
