// src/utils/logger.js
// ─────────────────────────────────────────────────────────────────────────────
// Logger centralizado com Winston.
// Em produção escreve em arquivos; em dev imprime colorido no console.
// ─────────────────────────────────────────────────────────────────────────────

const { createLogger, format, transports } = require("winston");
const env = require("../config/env");

const { combine, timestamp, printf, colorize, errors, json } = format;

// Formato legível para desenvolvimento
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Formato JSON estruturado para produção (ideal para Datadog, Logtail etc.)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: env.isDev ? "debug" : "info",
  format: env.isProd ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    ...(env.isProd
      ? [
          new transports.File({ filename: "logs/error.log", level: "error" }),
          new transports.File({ filename: "logs/combined.log" }),
        ]
      : []),
  ],
  exceptionHandlers: [new transports.Console()],
  rejectionHandlers: [new transports.Console()],
});

module.exports = logger;
