# Loa Design 2.0 — Operação pós-release

> Cada operação em produção exige **autorização explícita e separada**.
> Nenhum segredo (senha, connection string, token) deve ser escrito neste
> arquivo, em commits, em logs ou em relatórios.

## 1. Publicação da sprint final (PRs)

Nenhum PR tem migration nem altera variáveis de ambiente.

| Ordem | PR | Publica | Efeito visível |
|---|---|---|---|
| 1 | `feat/seguranca-autenticacao` | Render | **Todas as sessões abertas caem uma vez** (tokens sem versão de sessão). A Laura entra de novo com a senha atual. |
| 2 | `feat/mensagens-site` | Render + Vercel (painel) | Novo item no menu: "Mensagens do site". |
| 3 | `feat/importacao-legados` | Render + Vercel (painel) | Telefone pode ser informado na prévia da importação. |
| 4 | `fix/configuracoes-painel` | Vercel (painel) | Notificações com "Salvar"; e-mail de login separado do comercial. |
| 5 | `docs/operacao-pos-release` | — (fora de `Backend/`, `admin/` e `Frontend/`) | Nenhum. |

Os PRs 2 e 3 alteram backend e painel. A Vercel e o Render publicam em
paralelo (~1 min); se o painel ficar pronto antes da API, a tela nova pode
mostrar erro por alguns segundos — recarregar resolve. Para evitar, publique
nos horários sem uso.

Depois de cada merge:

1. Render **Live** no commit novo; logs sem erro de inicialização.
2. `GET /api/health` = 200; rotas protegidas sem token = 401.
3. Vercel **Ready** no commit novo (para os PRs com `admin/`).
4. Rollback, se necessário: Render → deploy anterior (o banco não muda);
   Vercel → "Promote" do deployment anterior. Nenhum PR exige rollback de banco.

## 2. Limpeza das credenciais auxiliares

| # | Item | Onde | Como | Risco |
|---|---|---|---|---|
| L1 | `Backend/.env.migrate` (credencial da role dona do schema) | máquina local | Apagar o arquivo (ou esvaziar as 3 variáveis). | Nenhum para produção. Uma nova migration exigirá preencher de novo. |
| L2 | Papel `loa_inspector` (somente leitura) | Neon, branch `production` | Console Neon → projeto → Branches → `production` → Roles → `loa_inspector` → Delete. O branch `pre-release-2-0` também tem uma cópia do papel: remover lá ou ao apagar o branch. | Nenhum para a API (ela usa `neondb_owner`). Perde-se a inspeção somente leitura. |
| L3 | `Backend/.env.inspect` | máquina local | Apagar depois do L2. | Nenhum. |
| L4 | Bancos locais com **cópia de dados reais** (`loadesign_restore_check`) | PostgreSQL local | `DROP DATABASE` quando o período de retenção terminar. | Contém dados pessoais de produção. |
| L5 | Bancos locais de ensaio (`loadesign_d1_drill*`, `loadesign_e2e`) | PostgreSQL local | `DROP DATABASE` (só dados sintéticos). | Nenhum. |
| L6 | Backups (`Backend/backups/`, `D:\LoaBackups\*.loaenc`) e branch Neon `pre-release-2-0` | local / Neon | Manter por **7–14 dias** após a estabilização; depois, decisão manual. | Apagar cedo demais elimina o ponto de recuperação. |

## 3. Rotação da senha de `neondb_owner` + `DATABASE_URL` do Render

A API usa `neondb_owner`. Ao redefinir a senha no Neon, a senha antiga deixa
de valer: **a API fica sem banco até o Render receber a URL nova**. Faça
tudo em sequência, em horário sem uso (janela estimada: 2–3 min).

Preparação (sem alterar nada):

1. Confirmar Render Live, health 200 e nenhum deploy em andamento.
2. Ter abertos lado a lado: Neon (Roles do branch `production`) e Render
   (serviço `loadesign` → Environment).

Execução (responsável técnico):

1. Neon → Roles → `neondb_owner` → **Reset password**. A nova connection
   string aparece **uma única vez**: copie a do endpoint **pooler** ou
   direto, conforme a atual do Render (manter o mesmo tipo de endpoint e
   `sslmode=require`).
2. Render → Environment → `DATABASE_URL` → Edit → colar → **Save and deploy**.
   Não altere nenhuma outra variável.
3. Limpar a área de transferência (`Set-Clipboard -Value $null`).

Verificação:

1. Render Live; log "Banco de dados conectado"; sem `P1000`/`P1001`.
2. `GET /api/health` = 200; `GET /api/settings` = 200 (lê o banco);
   `GET /api/contacts` sem token = 401.
3. Login da Laura funcionando e Dashboard com os números esperados.

Recuperação:

- Deploy falhou por URL errada → corrigir o valor e salvar de novo (o Render
  mantém a versão anterior no ar, mas ela já não autentica no banco).
- Senha perdida antes de salvar no Render → **Reset password** de novo e
  repetir o passo 2.
- Não há como voltar à senha antiga (e não se deve).
- Se precisar de uma migration no futuro, preencher `.env.migrate` com a
  credencial nova, na sessão, e apagar ao final.

## 4. Segurança da autenticação (estado após a sprint)

- Login: limite de 5 falhas por IP + e-mail e 20 por IP em 15 min (429).
  Em memória: reiniciar o serviço zera os contadores.
- Sessões: JWT de 7 dias com versão de sessão derivada do hash de senha.
  Trocar a senha (painel) ou redefini-la (`scripts/admin-reset-password.js`)
  derruba todas as sessões. Trocar o `JWT_SECRET` também derruba todas.
- Rotas administrativas: exigem sessão válida **e** papel ADMIN/SUPER_ADMIN.
- Credenciais no código/bundle: verificadas por teste
  (`admin/tests/no-credentials.test.mjs`, `Backend/tests/static/config.test.js`).
