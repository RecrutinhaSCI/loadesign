// Regressão: Configurações só gravam ao clicar em "Salvar alterações" e o
// e-mail de login nunca é alterado pela tela de Perfil.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(ROOT, 'src', 'pages', 'admin', 'SettingsPage.tsx'), 'utf8')

test('interruptores de notificação editam um rascunho (sem gravação imediata)', () => {
  assert.doesNotMatch(src, /updateNotifications\s*\(/, 'nenhuma gravação direta de notificações')
  assert.match(src, /onChange=\{\(e\) => setNotifDraft\(/, 'checkbox altera apenas o rascunho')
  assert.match(src, /updateSettings\(\{ notifications: notifDraft \}\)/, 'gravação só no handleSave')
})

test('botão Salvar e aviso de alterações pendentes nas abas editáveis', () => {
  assert.match(src, /Salvar alterações/)
  assert.match(src, /Alterações não salvas/)
  assert.match(src, /Descartar/)
  assert.match(src, /beforeunload/)
  assert.match(src, /window\.confirm\(/, 'confirma antes de trocar de aba com alterações')
})

test('perfil: e-mail comercial separado do e-mail de login (somente leitura)', () => {
  assert.match(src, /E-mail comercial/)
  assert.match(src, /E-mail de acesso ao painel \(login\)/)
  assert.doesNotMatch(src, /updateUser\(\{[^}]*email/, 'o e-mail do usuário autenticado não é alterado')
  assert.match(src, /ownerEmail: profileDraft\.commercialEmail/)
})
