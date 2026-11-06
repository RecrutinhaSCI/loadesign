# Release 2.0 — Fluxo Comercial Integrado · Runbook

> Cada fase de produção exige **autorização explícita e separada**.
> Nenhum comando abaixo deve ser executado sem ela.

## Fase A — Verificações sem escrita (produção)

1. **Painel Render (serviço do backend)** — confirmar, sem alterar:
   - Root Directory = `Backend` (o `render.yaml` diz `loadesign/Backend`, que não existe no repositório).
   - Build Command: **não pode conter `prisma migrate deploy`**. Se contiver, a
     publicação tentaria executar `0_baseline` no Neon e falharia (tabelas já
     existem). Valor esperado: `npm install && npx prisma generate`.
   - Start Command `npm start`; Health Check `/api/health`.
   - Variáveis: `NODE_ENV=production` (**obrigatória**: sem ela a API recusa
     iniciar com a URL do Neon), `DATABASE_URL`, `JWT_SECRET` (≥ 32 caracteres),
     `JWT_EXPIRES_IN`, `CORS_ORIGIN` (deve conter o domínio do painel).
   - Branch de auto-deploy (provavelmente `main`).
2. **Vercel — painel admin**: Root Directory `admin`, `VITE_API_URL` apontando para
   `https://<backend>/api`, branch de produção.
3. **Vercel — site público**: Root Directory `Frontend`. O código do site **não
   mudou** nesta release; um redeploy automático é inofensivo.
4. **Neon — inspeção somente leitura** (de preferência com um papel read-only):
   ```bash
   INSPECT_DATABASE_URL="<url do Neon>" INSPECT_CONFIRM_HOST="<host do Neon>" \
     node scripts/db-catalog-inspect.js --reference prisma/reference/legacy-catalog.json --out neon-catalog.json
   ```
   Defina as variáveis só no terminal; nunca em arquivos versionados.
   Prosseguir apenas com veredito **COMPATÍVEL** (ou **REVISAR** com cada item analisado).

## Fase B — Backup verificado

0. Pré-verificação (sem escrita): `node scripts/prod-backup.js plan`.
1. **Branch Neon `pre-release-2-0`** a partir de `production` (console do Neon →
   Branches → Create branch → parent `production`, "Current point in time",
   **sem** compute ou com compute desligado). Anotar ID do branch e horário.
   Não altera o `production` (copy-on-write).
2. **Dump consistente** com o usuário somente leitura (`.env.inspect`):
   `node scripts/prod-backup.js dump --execute`
   - transação REPEATABLE READ READ ONLY + `pg_export_snapshot()`;
   - `pg_dump --format=custom --no-owner --no-privileges --schema=public --snapshot=<id>`
     (credenciais por variáveis PG*, nunca na linha de comando);
   - hashes md5 por tabela calculados **no mesmo snapshot**;
   - SHA-256 do arquivo, `pg_restore --list` validado (11 TABLE + 11 TABLE DATA);
   - saída em `Backend/backups/` (ignorado pelo Git). Nada é sobrescrito.
   - Se a credencial somente leitura falhar, o script para. Nunca usar outra credencial.
3. **Restauração verificada**: `node scripts/prod-backup.js restore --execute`
   - confere o SHA-256; cria o banco local NOVO `loadesign_restore_check`
     (recusa se existir); `pg_restore --single-transaction --exit-on-error`
     sem a entrada `SCHEMA public` (já existe em banco novo);
   - compara contagem + md5 de cada tabela com o manifesto (devem ser idênticos);
   - informa se a produção mudou desde o snapshot (alterações concorrentes
     não invalidam o backup, que vale para o instante do snapshot).

**Critério de aprovação:** branch criado + 11/11 tabelas idênticas na cópia.

### Recuperação — antes de qualquer restauração em produção

1. Confirmar o incidente e o alvo (projeto Neon da Loa Design, branch
   `production` — IDs registrados no relatório interno do release, fora do repositório).
2. Congelar escritas: suspender o serviço no Render (o site público passa a
   falhar no formulário; o painel fica indisponível).
3. Exportar o estado atual (novo `pg_dump`) para não perder dados posteriores
   ao snapshot — o restore do Neon descarta o que foi gravado depois.
4. Preferência de restauração:
   a) **Neon "Restore" do `production` a partir de `pre-release-2-0`** (o Neon
      cria automaticamente um backup do estado anterior);
   b) alternativa sem tocar no `production`: apontar o `DATABASE_URL` do Render
      para o endpoint do branch `pre-release-2-0`;
   c) último recurso: `pg_restore` do dump verificado em um branch novo.
5. Validar com `db-catalog-inspect.js` e o checklist da Fase F antes de reabrir.

**Limitações do plano Neon (confirmar no console antes da execução):** janela
de histórico/PITR, limite de branches e de armazenamento do plano atual; o
branch `pre-release-2-0` conta no armazenamento e deve ser removido somente
após a estabilização do release (decisão manual).

## Fase C — Código

Commit na branch `feat/loa-fluxo-comercial-integrado`, push e Pull Request para
`main` (revisão). **Ainda sem merge.**

## Fase D — Migração do Neon (aditiva, ~segundos)

Executada com `scripts/prod-migrate.js` (envolve o `prisma-safe` e para sozinho
em qualquer condição inesperada). Credencial em `Backend/.env.migrate`
(ignorado pelo Git), preenchida pela responsável técnica só para a sessão:

```
MIGRATE_DATABASE_URL=   # role dona do schema, endpoint DIRETO (sem "-pooler"), sslmode=require
MIGRATE_CONFIRM_HOST=   # host exato do endpoint direto
MIGRATE_EXPECTED_BRANCH=# ID do branch production
```

| Passo | Comando | Escreve? | Aprovação |
|---|---|---|---|
| D1.0 | `node scripts/prod-migrate.js check` | não | identidade, branch, CREATE, catálogo COMPATÍVEL, `_prisma_migrations` inexistente, legado = backup |
| D1.1 | `node scripts/prod-migrate.js resolve-baseline --execute` | só `_prisma_migrations` | 1 registro `0_baseline` concluído; legado = backup |
| D1.2 | `node scripts/prod-migrate.js deploy --execute` | tabelas/tipos novos | 2 migrations concluídas; 7 tabelas + 10 tipos novos vazios; legado = backup; status "up to date" |
| D1.3 | `node scripts/prod-migrate.js verify` | não | repete as verificações |

Erro em D1.2: a migração é transacional (nada aplicado), mas o Prisma registra
a tentativa. **Não repetir.** Rodar `verify`, analisar e, com autorização,
`migrate resolve --rolled-back 20261105120000_fluxo_comercial_2_0`.

O backend antigo continua funcionando após a migração (verificado na Fase C1).
Ao final: esvaziar/remover a credencial `.env.migrate`. Rotacionar a senha da
role dona do schema **somente** em conjunto com a atualização do `DATABASE_URL`
do backend em produção (senão a API perde o acesso ao banco).

## Fase E — Publicação

1. Merge do PR em `main` → Render publica o backend. Aguardar health check verde.
2. Validar: `GET /api/health` = 200; `GET /api/contacts` sem token = 401.
3. Publicar o painel (Vercel) **depois** do backend no ar.
4. Site público: nenhuma ação necessária.

## Fase F — Validação pós-publicação (sem operações financeiras reais)

- Login da Laura; Dashboard abre com números coerentes.
- Telas legadas (Leads do site, Serviços, rotas `/clients`, `/legacy/quotes`,
  `/legacy/projects`, `/finance/transactions`) com os dados antigos.
- Contatos → "Importar legados": **somente a prévia**, sem confirmar.
- Orçamentos, Projetos, Financeiro, Agenda abrem (vazios no início).
- Formulário do site público: envio real só se autorizado (gera Lead real).
- Monitorar logs do Render por 30 min (erros 5xx, P20xx do Prisma).

## Rollback

| Situação | Ação |
|---|---|
| Painel com erro | Promover deploy anterior na Vercel (instantâneo) |
| Backend com erro | Rollback para o deploy anterior no Render (o banco aditivo é compatível) |
| Migração falhou no meio | O SQL tem `BEGIN`/`COMMIT` explícitos (o Prisma **não** é tratado como transacional por padrão); ensaio com falha proposital confirmou: nenhuma tabela/tipo criado. O Prisma registra a tentativa em `_prisma_migrations` (fora da transação, `finished_at` nulo): rodar `migrate resolve --rolled-back 20261105120000_fluxo_comercial_2_0` antes de nova tentativa |
| Precisa remover as tabelas novas | `prisma/rollback/…down.sql`, só com autorização e após exportar dados novos |
| Corrupção/perda de dados legados | Restaurar a partir do branch Neon `pre-release-2-0` (ou do `pg_dump`) |
