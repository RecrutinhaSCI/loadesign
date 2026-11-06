// src/utils/clientIp.js
// ─────────────────────────────────────────────────────────────────────────────
// Identificação do IP do cliente atrás dos proxies do Render.
//
// Fatos observados em produção (logs de 06/11/2026): com `trust proxy = 1`, o
// req.ip era um endereço INTERNO (10.x) que variava entre requisições — há
// mais de um salto de proxy e a quantidade não é documentada pelo Render. O
// Render também não remove o X-Forwarded-For enviado pelo cliente: apenas
// acrescenta entradas à direita.
//
// Estratégia (sem contar saltos, sem confiar no cliente):
//   o Express percorre a cadeia [socket, XFF da direita p/ a esquerda] e para no
//   primeiro endereço NÃO confiável. Confiamos apenas em endereços que nunca são
//   o cliente final: loopback, redes privadas/internas, link-local, CGNAT e as
//   faixas publicadas da Cloudflare (CDN que pode estar na frente do Render).
//   Assim o req.ip é o primeiro endereço público acrescentado pela
//   infraestrutura — qualquer coisa que o cliente escreveu fica à ESQUERDA dele
//   e é ignorada.
//
// Se a cadeia inteira for confiável (nenhum endereço público), o IP é
// considerado desconhecido: o limite por IP é suspenso para essa requisição
// (evita bloquear todos os usuários atrás do mesmo proxy) e o limite por conta
// continua valendo.
// ─────────────────────────────────────────────────────────────────────────────

const net = require("net");

const INTERNAL_V4 = [
  ["127.0.0.0", 8], ["10.0.0.0", 8], ["172.16.0.0", 12], ["192.168.0.0", 16],
  ["169.254.0.0", 16], ["100.64.0.0", 10], ["0.0.0.0", 8],
];
const INTERNAL_V6 = [["::1", 128], ["fc00::", 7], ["fe80::", 10], ["::", 128]];

// Faixas publicadas em https://www.cloudflare.com/ips/ (conferir periodicamente).
const CLOUDFLARE_V4 = [
  ["173.245.48.0", 20], ["103.21.244.0", 22], ["103.22.200.0", 22], ["103.31.4.0", 22],
  ["141.101.64.0", 18], ["108.162.192.0", 18], ["190.93.240.0", 20], ["188.114.96.0", 20],
  ["197.234.240.0", 22], ["198.41.128.0", 17], ["162.158.0.0", 15], ["104.16.0.0", 13],
  ["104.24.0.0", 14], ["172.64.0.0", 13], ["131.0.72.0", 22],
];
const CLOUDFLARE_V6 = [
  ["2400:cb00::", 32], ["2606:4700::", 32], ["2803:f800::", 32], ["2405:b500::", 32],
  ["2405:8100::", 32], ["2a06:98c0::", 29], ["2c0f:f248::", 32],
];

function buildList(v4, v6) {
  const list = new net.BlockList();
  for (const [a, p] of v4) list.addSubnet(a, p, "ipv4");
  for (const [a, p] of v6) list.addSubnet(a, p, "ipv6");
  return list;
}
const internal = buildList(INTERNAL_V4, INTERNAL_V6);
const cloudflare = buildList(CLOUDFLARE_V4, CLOUDFLARE_V6);

/** Normaliza (remove "::ffff:" de IPv4 mapeado, porta, colchetes) e valida. */
function normalizeIp(raw) {
  let s = String(raw || "").trim();
  if (s.startsWith("[")) s = s.slice(1, s.indexOf("]") > 0 ? s.indexOf("]") : undefined);
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(s)) s = s.split(":")[0];
  if (/^::ffff:\d{1,3}(\.\d{1,3}){3}$/i.test(s)) s = s.slice(7);
  const family = net.isIP(s);
  return family ? { ip: s, family: family === 4 ? "ipv4" : "ipv6" } : null;
}

/** Classifica um endereço: "internal" | "cloudflare" | "public" | "invalid". */
function classify(raw) {
  const n = normalizeIp(raw);
  if (!n) return "invalid";
  if (internal.check(n.ip, n.family)) return "internal";
  if (cloudflare.check(n.ip, n.family)) return "cloudflare";
  return "public";
}

/**
 * Função para `app.set("trust proxy", fn)`. Confia só em saltos de
 * infraestrutura; endereço inválido NÃO é confiável (encerra a busca).
 */
function trustProxy(addr) {
  const c = classify(addr);
  return c === "internal" || c === "cloudflare";
}

/** IP do cliente para limites, ou null se não houver endereço público confiável. */
function clientIpOf(req) {
  const ip = req.ip;
  return classify(ip) === "public" ? normalizeIp(ip).ip : null;
}

/** Formato da cadeia, SEM os endereços (para diagnóstico sem dados pessoais). */
function chainShape(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
  const socket = req.socket && req.socket.remoteAddress;
  return [...xff, socket].map((a) => ({ internal: "I", cloudflare: "C", public: "P", invalid: "X" })[classify(a)]).join(",");
}

module.exports = { trustProxy, clientIpOf, classify, normalizeIp, chainShape };
