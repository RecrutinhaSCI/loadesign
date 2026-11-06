# Loa Design Digital — Backend

API Express + Prisma + PostgreSQL que atende o site público (`Frontend/`) e o
painel administrativo (`admin/`).

| Camada    | Tecnologia                         |
|-----------|------------------------------------|
| Runtime   | Node.js >= 18 (testado no 24)      |
| Framework | Express 4                          |
| ORM       | Prisma 5                           |
| Banco     | PostgreSQL 16 (local via Docker)   |
| Auth      | JWT (jsonwebtoken) + bcryptjs      |
| Testes    | `node:test` + supertest            |

> **Regra de ouro:** o ambiente local nunca conversa com produção. A URL do
> banco de produção (Neon) existe apenas no painel do provedor de deploy.
> Nunca a coloque em `.env`, `.env.test` ou em qualquer arquivo do repositório.

---

## 1. Pré-requisitos

- Node.js >= 18
- Docker Desktop (para o PostgreSQL local)

## 2. Instalação

```bash
cd Backend
npm ci                     # instala exatamente o package-lock.json
```

O `postinstall` só gera o Prisma Client (`prisma generate`) — não toca no banco.

## 3. Configuração do ambiente local

```bash
cp .env.example .env              # desenvolvimento → banco loadesign_dev
cp .env.test.example .env.test    # testes         → banco loadesign_test
```

- Gere um `JWT_SECRET` próprio:
  `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- Preencha `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` (mín. 12
  caracteres) com valores **fictícios** se for usar o bootstrap.
- `.env` e `.env.test` são ignorados pelo Git. Nunca use credenciais reais.

Confirme o destino antes de qualquer comando de banco:

```bash
npm run db:guard        # deve imprimir: [DB GUARD] OK — destino local: localhost:55432/loadesign_dev
npm run test:check      # valida .env.test e se o PostgreSQL local responde
```

## 4. PostgreSQL local

**Opção A — PostgreSQL nativo no Windows (em uso):** serviço
`postgresql-x64-18`, porta 5432. Crie `loadesign_dev` e `loadesign_test` (pgAdmin)
e ajuste `DATABASE_URL` em `.env` / `.env.test` com a senha local. Antes de
aplicar o schema, confira que os bancos estão vazios (somente leitura):

```bash
node scripts/db-local-inspect.js dev
node scripts/db-local-inspect.js test
```

**Opção B — Docker:**

O `Backend/docker-compose.yml` sobe um PostgreSQL **exclusivo do projeto**:

| Item       | Valor                                                   |
|------------|---------------------------------------------------------|
| Projeto    | `loadesign-local`                                       |
| Container  | `loadesign-local-postgres`                              |
| Volume     | `loadesign_local_pgdata`                                |
| Porta      | `127.0.0.1:55432` (só loopback, porta incomum)          |
| Usuário    | `loa_local` (fictício, só local)                        |
| Bancos     | `loadesign_dev` (desenvolvimento) e `loadesign_test` (testes) |
| Healthcheck| `pg_isready` nos dois bancos                            |

```bash
docker compose up -d       # dentro de Backend/
docker compose ps          # aguarde "healthy"
docker compose down        # para (mantém dados)
docker compose down -v     # apaga SOMENTE o volume deste projeto
```

O banco `loadesign_test` é criado por `docker/postgres/init/` na primeira
subida do volume. O `docker-compose.yml` da raiz do repositório (porta 5433)
é legado e não é usado por este backend.

## 5. Schema (Prisma) no banco local

As migrations existentes em `prisma/migrations/` foram geradas para SQLite e
**não podem ser aplicadas no PostgreSQL** (veja §10). Até o baseline, os bancos
locais descartáveis recebem o schema via `db push`, sempre pelo executor
protegido:

```bash
npm run db:push            # schema em loadesign_dev   (usa .env)
npm run test:db:push       # schema em loadesign_test  (usa só .env.test)
```

`db push` sem flags falha se uma alteração implicar perda de dados; as flags
`--accept-data-loss` e `--force-reset` são recusadas pelo executor. Para
recomeçar do zero, remova o volume local (`docker compose down -v`).

## 6. Bootstrap × seed de demonstração

| | `npm run db:bootstrap` (`prisma/bootstrap.js`) | `prisma/seed.demo.js` |
|---|---|---|
| Objetivo | Deixar um banco novo utilizável | Popular banco descartável com dados fictícios |
| Destrutivo? | **Não** — nunca apaga nem atualiza | **Sim** — pode apagar dados de demonstração |
| Admin | Cria o primeiro admin só se não houver usuários | Cria admin demo só se não existir |
| Senha | `BOOTSTRAP_ADMIN_PASSWORD` (≥ 12), nunca impressa | `DEMO_ADMIN_PASSWORD` (≥ 8), nunca impressa |
| Execução | Script npm | **Manual**, sem script npm, exige `DEMO_SEED_CONFIRM_DB=<nome do banco>` |
| Destino | Somente banco local (guard) | Somente banco local (guard) |

## 7. Rodar a API

```bash
npm run dev       # desenvolvimento (nodemon) — http://localhost:3333
npm start         # node src/server.js
```

Fora de `NODE_ENV=production`, a API **recusa iniciar** se `DATABASE_URL`
apontar para um host não local.

Verificação rápida: `GET http://localhost:3333/api/health`.

## 8. Testes

```bash
npm run test:static        # testes puros: sem banco, sem rede
npm run test:check         # valida .env.test + PostgreSQL local no ar
npm run test:db:push       # aplica o schema em loadesign_test
npm run test:integration   # testes de integração (supertest + PostgreSQL)
npm test                   # estáticos + integração
```

Proteções dos testes de integração:

1. `scripts/test-env-run.js` lê **somente** `.env.test`; variáveis do shell e do
   `.env` de desenvolvimento são descartadas.
2. Exige `NODE_ENV=test`, host local, sem `DB_ALLOWED_HOSTS` e banco
   **exatamente** `loadesign_test` — senão aborta antes de conectar.
3. `tests/support/app.js` reaplica o guard antes de carregar a API.
4. Antes de qualquer escrita/limpeza, confirma no PostgreSQL
   (`SELECT current_database()`) que a conexão está em `loadesign_test`.
5. Todos os dados são sintéticos (`@example.test`); senhas geradas a cada execução.

Testes marcados como `todo` documentam comportamentos atuais que ainda serão
corrigidos (não falham a suíte).

## 9. Comandos seguros × proibidos

**Seguros (local):** `npm ci`, `npm run dev|start`, `db:guard`, `db:validate`,
`db:generate`, `db:push`, `db:bootstrap`, `db:studio`, `test:*`,
`node scripts/db-local-inspect.js dev|test`, `node scripts/serve-test-db.js`.

**Proibidos em produção / sem autorização explícita:**

- `npx prisma ...` digitado diretamente (ignora todas as proteções).
- `prisma migrate dev | reset | deploy | resolve`, `prisma db push | pull | execute`
  contra o Neon.
- `npm run db:migrate:prod` — bloqueado pelo executor até o baseline (§10).
- `--accept-data-loss`, `--force-reset`, `--url`, `--from-url`, `--to-url`,
  `--shadow-database-url`.
- `node prisma/seed.demo.js` fora de um banco local descartável.
- Copiar a `DATABASE_URL` de produção para qualquer arquivo local.

O build (`npm run build`) e o `render.yaml` só executam `prisma generate`.
Migrations de produção são uma operação manual, separada e autorizada.

## 10. Migrations PostgreSQL (release 2.0)

- `prisma/migrations/0_baseline` — estrutura legada. **No Neon é apenas marcada
  como aplicada** (`migrate resolve --applied 0_baseline`), depois de a
  inspeção somente leitura confirmar que o banco real é compatível.
- `prisma/migrations/20261105120000_fluxo_comercial_2_0` — migração **aditiva**
  (só cria tabelas/tipos/índices novos), em transação única.
- `prisma/migrations_sqlite_legacy/` — migrations SQLite antigas, arquivadas.
  Nunca executar.
- `prisma/rollback/` — reversão manual da migração aditiva (remove só tabelas novas).
- `node scripts/rehearse-migration.js` — ensaio local da sequência de produção.
- `node scripts/db-catalog-inspect.js --reference prisma/reference/legacy-catalog.json`
  — inspeção **somente leitura** (transação READ ONLY) e veredito de compatibilidade.

Procedimento completo: [RELEASE-2.0.md](RELEASE-2.0.md). `db push` nunca é usado em produção.

## 11. Endpoints

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/health` | — |
| POST | `/api/auth/login` | — |
| GET | `/api/auth/me` · POST `/api/auth/change-password` | JWT |
| POST | `/api/contact` (form público → ContactMessage + Lead) | — |
| GET/PATCH/DELETE | `/api/contact[/:id]` | JWT |
| GET | `/api/services/public` (ativos, **sem preço**) | — |
| CRUD | `/api/services` | JWT |
| GET | `/api/settings`, `/api/testimonials`, `/api/portfolio` | — |
| PUT/PATCH | `/api/settings` · POST/PUT/DELETE testimonials/portfolio | JWT |
| CRUD | `/api/clients`, `/api/leads`, `/api/quotes`, `/api/projects`, `/api/transactions` (legado) | JWT |

### Fluxo comercial integrado (JWT + papel ADMIN)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/contacts` | Lista (busca, filtros, paginação) / cadastra. Duplicidade → 409 `DUPLICATE_CONTACT` |
| GET/PATCH | `/api/contacts/:id` | Detalhe com orçamentos, projetos, cobranças e histórico / edição |
| POST | `/api/contacts/:id/convert` · `/archive` · `/unarchive` | Prospect → cliente; arquivamento lógico |
| GET | `/api/contacts/duplicates?phone=&email=` | Verificação de duplicidade |
| GET/POST | `/api/contacts/legacy-import` | Prévia / importação idempotente de leads e clients legados (`{ confirm: true }`) |
| GET/POST | `/api/proposals` | Orçamentos; criar com contato existente ou novo, numa transação |
| GET/PATCH | `/api/proposals/:id` | Detalhe com histórico / edição (só pendente) |
| POST | `/api/proposals/:id/approve` | Aprova, converte prospect, oficializa projeto e gera cobranças |
| POST | `/api/proposals/:id/reject` · `/reopen` · `/cancel` | Recusa, reabertura e cancelamento |
| GET | `/api/work-projects[/:id]` | Projetos oficializados com totais pendente/recebido |
| PATCH | `/api/work-projects/:id` | Status operacional e datas opcionais |
| POST | `/api/work-projects/:id/cancel` | Cancela pendências e encerra mensalidade; recebidos preservados |
| GET | `/api/receivables` · `/summary` · `/:id` | Contas a receber, totais por natureza, detalhe |
| PATCH | `/api/receivables/:id` | Corrige vencimento/forma/observações (só pendente) |
| POST | `/api/receivables/:id/receive` · `/reverse` · `/cancel` | Baixa atômica (+ lançamento), estorno, cancelamento |
| POST | `/api/recurring/:id/generate` · `/pause` · `/resume` · `/end` | Mensalidades: geração sob demanda sem duplicar |
| GET/POST/PATCH | `/api/calendar[/:id]` | Agenda (`from`/`to` ISO, máx. 100 dias) + vencimentos e entregas derivados |
| GET | `/api/dashboard` | Métricas reais |

Regras principais: dinheiro em `Decimal(12,2)` (centavos inteiros no código);
datas de calendário como `AAAA-MM-DD`; "hoje" calculado em
America/Sao_Paulo; nada é apagado (cancelamento/estorno com histórico em
`activity_logs`).

## 12. Homologação visual sem sujar o banco de desenvolvimento

```bash
node scripts/serve-test-db.js   # API em :3333 usando somente loadesign_test
```

Em seguida, `npm run dev` em `admin/`. Os testes de integração limpam esse
banco quando rodam.
