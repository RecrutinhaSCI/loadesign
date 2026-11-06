// Regressão de segurança: nenhuma credencial fixa no painel (código-fonte e bundle).
// Executar: npm test  (depois de `npm run build`, também verifica o dist/).
//
// A senha de demonstração antiga NÃO aparece aqui: o teste compara a impressão
// digital SHA-256 de cada texto literal com a da senha conhecida.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const DIST = join(ROOT, 'dist')

// SHA-256 da senha de demonstração já publicada.
const KNOWN_FINGERPRINTS = new Set([
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
])
// SHA-256 do login (e-mail) administrativo: não pode ser embutido no bundle público.
const LOGIN_FINGERPRINTS = new Set([
  '2e96beba8970b91d774e40e54da009741d4afaaf10060e9b60c8e4bc2d4ba232',
])

const sha256 = (s) => createHash('sha256').update(s).digest('hex')

function walk(dir, exts) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p, exts))
    else if (exts.some((e) => p.endsWith(e))) out.push(p)
  }
  return out
}

// Candidatos a literal: o texto entre CADA aspa e a próxima aspa igual. Não
// consome a entrada, então o pareamento de aspas em código minificado (regex,
// apóstrofos em textos) não esconde nenhum literal.
function literals(code) {
  const out = []
  for (let i = 0; i < code.length; i++) {
    const q = code[i]
    if (q !== '"' && q !== "'" && q !== '`') continue
    const j = code.indexOf(q, i + 1)
    if (j > i + 1 && j - i - 1 <= 200) out.push(code.slice(i + 1, j))
  }
  return out
}

function findCredentials(files, base) {
  const issues = new Set()
  for (const f of files) {
    const code = readFileSync(f, 'utf8')
    const rel = relative(base, f)
    const lits = literals(code)
    if (lits.some((lit) => LOGIN_FINGERPRINTS.has(sha256(lit.trim().toLowerCase())))) {
      issues.add(`${rel}: contém o login administrativo fixo`)
    }
    if (lits.some((lit) => KNOWN_FINGERPRINTS.has(sha256(lit)))) {
      issues.add(`${rel}: contém uma credencial de demonstração conhecida`)
    }
  }
  return [...issues]
}

function assertNoCredentials(files, base) {
  const issues = findCredentials(files, base)
  assert.deepEqual(issues, [], issues.join('\n'))
}

test('LoginPage inicia e-mail e senha vazios', () => {
  const code = readFileSync(join(SRC, 'pages', 'LoginPage.tsx'), 'utf8')
  const email = code.match(/\[\s*email\s*,\s*setEmail\s*\]\s*=\s*useState(?:<[^>]*>)?\(([^)]*)\)/)
  const password = code.match(/\[\s*password\s*,\s*setPassword\s*\]\s*=\s*useState(?:<[^>]*>)?\(([^)]*)\)/)
  assert.ok(email && password, 'estados de e-mail e senha não encontrados')
  assert.match(email[1].trim(), /^(['"`])\1$/, 'e-mail precisa iniciar vazio')
  assert.match(password[1].trim(), /^(['"`])\1$/, 'senha precisa iniciar vazia')
  // Nenhum valor padrão de senha em atributos.
  assert.doesNotMatch(code, /defaultValue\s*=/, 'LoginPage não deve usar defaultValue')
})

test('código-fonte do painel sem credenciais fixas', () => {
  assertNoCredentials(walk(SRC, ['.ts', '.tsx', '.js', '.jsx']), ROOT)
})

test('bundle de produção (dist/) sem credenciais fixas', (t) => {
  if (!existsSync(DIST)) return t.skip('dist/ inexistente — rode `npm run build` antes')
  const files = walk(DIST, ['.js', '.html'])
  assert.ok(files.length > 0, 'dist/ sem arquivos .js/.html')
  assertNoCredentials(files, ROOT)
})

test('detector encontra literais por impressão digital (autoteste sintético)', () => {
  const fake = 'valor-sintetico-de-teste'
  const prints = new Set([sha256(fake)])
  const code = `const [p, setP] = useState('${fake}'); const x = "outro"`
  assert.ok(literals(code).some((l) => prints.has(sha256(l))))
  assert.ok(!literals('const y = "nada"').some((l) => prints.has(sha256(l))))
})
