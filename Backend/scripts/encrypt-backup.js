#!/usr/bin/env node
// scripts/encrypt-backup.js
// ─────────────────────────────────────────────────────────────────────────────
// Segunda cópia CRIPTOGRAFADA dos backups (sem programas externos).
//
//   node scripts/encrypt-backup.js encrypt <pasta-destino-fora-do-projeto>
//   node scripts/encrypt-backup.js verify  <arquivo.loaenc>
//
// - AES-256-GCM (confidencialidade + detecção de adulteração).
// - Chave derivada da senha com scrypt (N=2^17, r=8, p=1) e sal aleatório.
// - Os arquivos de Backend/backups/ são empacotados num contêiner único antes
//   da criptografia: NOMES, tamanhos e conteúdos ficam protegidos.
// - A senha é digitada no terminal (oculta), com confirmação. Nunca é gravada,
//   impressa ou aceita por argumento/variável de ambiente.
// - `verify` decifra em memória e confere o SHA-256 de cada arquivo contra o
//   original, sem gravar nada em texto claro.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BACKEND = path.resolve(__dirname, "..");
const SOURCE = path.join(BACKEND, "backups");
const MAGIC = Buffer.from("LOAENC1\0");
const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const die = (m) => { console.error(`[ENC] ✖ ${m}`); process.exit(1); };

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase.normalize("NFKC"), salt, 32, SCRYPT);
}

function pack(dir) {
  const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort();
  if (!files.length) throw new Error("pasta de backups vazia");
  return {
    files,
    payload: Buffer.from(JSON.stringify({
      createdAt: new Date().toISOString(),
      files: files.map((name) => {
        const data = fs.readFileSync(path.join(dir, name));
        return { name, size: data.length, sha256: sha256(data), data: data.toString("base64") };
      }),
    })),
  };
}

function encryptBuffer(plain, passphrase) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  cipher.setAAD(MAGIC);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body]);
}

function decryptBuffer(blob, passphrase) {
  if (!blob.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("formato desconhecido");
  let o = MAGIC.length;
  const salt = blob.subarray(o, (o += 16));
  const iv = blob.subarray(o, (o += 12));
  const tag = blob.subarray(o, (o += 16));
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(blob.subarray(o)), decipher.final()]);
  } catch {
    throw new Error("senha incorreta ou arquivo adulterado");
  }
}

function verifyPayload(plain, originalDir) {
  const doc = JSON.parse(plain.toString());
  const results = doc.files.map((f) => {
    const data = Buffer.from(f.data, "base64");
    const okInner = sha256(data) === f.sha256 && data.length === f.size;
    const orig = originalDir && fs.existsSync(path.join(originalDir, f.name)) ? sha256(fs.readFileSync(path.join(originalDir, f.name))) : null;
    return { name: f.name, size: f.size, sha256: f.sha256, okInner, matchesOriginal: orig === null ? null : orig === f.sha256 };
  });
  return { createdAt: doc.createdAt, results };
}

function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error("execute em um terminal interativo (a senha é digitada por você)"));
    process.stdout.write(prompt);
    const stdin = process.stdin;
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const finish = () => { stdin.setRawMode(false); stdin.pause(); stdin.removeListener("data", onData); process.stdout.write("\n"); };
    // Processa caractere a caractere: senha colada chega num único bloco.
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

async function main() {
  const [cmd, target] = process.argv.slice(2);
  if (cmd === "encrypt") {
    if (!target) die("informe a pasta de destino (fora do projeto).");
    const dest = path.resolve(target);
    if (dest.toLowerCase().startsWith(path.resolve(BACKEND, "..").toLowerCase())) die("o destino precisa estar FORA do diretório do projeto.");
    if (!fs.existsSync(dest)) die("pasta de destino não existe.");
    const p1 = await askHidden("Senha da cópia criptografada (mín. 16 caracteres): ");
    if (p1.length < 16) die("senha curta demais.");
    const p2 = await askHidden("Confirme a senha: ");
    if (p1 !== p2) die("as senhas não conferem.");
    const { files, payload } = pack(SOURCE);
    const blob = encryptBuffer(payload, p1);
    const out = path.join(dest, `loadesign-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.loaenc`);
    const partial = `${out}.partial`;
    if (fs.existsSync(out) || fs.existsSync(partial)) die("arquivo de destino já existe — nada será sobrescrito.");
    // Grava como .partial (sem sobrescrever) e só promove após verificação.
    fs.writeFileSync(partial, blob, { flag: "wx" });
    const check = verifyPayload(decryptBuffer(fs.readFileSync(partial), p1), SOURCE);
    const ok = check.results.every((r) => r.okInner && r.matchesOriginal);
    if (ok) fs.renameSync(partial, out);
    console.log(`[ENC] ${files.length} arquivo(s) protegidos · ${blob.length} bytes · SHA-256 do arquivo cifrado ${sha256(blob)}`);
    console.log(`[ENC] ${ok ? "✔ verificação OK: todos os arquivos conferem com os originais" : "✖ verificação FALHOU"}`);
    console.log(`[ENC] destino: ${ok ? out : `${partial} (NÃO promovido — verificação falhou)`}`);
    process.exit(ok ? 0 : 1);
  }
  if (cmd === "verify") {
    if (!target || !fs.existsSync(target)) die("informe o arquivo .loaenc.");
    const pass = await askHidden("Senha: ");
    const check = verifyPayload(decryptBuffer(fs.readFileSync(target), pass), fs.existsSync(SOURCE) ? SOURCE : null);
    for (const r of check.results) console.log(`[ENC] ${r.okInner ? "✔" : "✖"} ${r.name} · ${r.size} bytes · ${r.sha256.slice(0, 16)}…${r.matchesOriginal === null ? "" : r.matchesOriginal ? " · igual ao original" : " · DIFERENTE do original"}`);
    process.exit(check.results.every((r) => r.okInner && r.matchesOriginal !== false) ? 0 : 1);
  }
  die("uso: encrypt <pasta-destino> | verify <arquivo.loaenc>");
}

if (require.main === module) main().catch((e) => die(e.message));

module.exports = { encryptBuffer, decryptBuffer, verifyPayload, pack };
