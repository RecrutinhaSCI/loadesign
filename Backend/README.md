# Loa Design Digital — Backend Setup

## Stack

| Camada       | Tecnologia          |
|--------------|---------------------|
| Runtime      | Node.js >= 18       |
| Framework    | Express 4           |
| ORM          | Prisma 5            |
| Banco        | PostgreSQL 15+      |
| Validação    | express-validator   |
| Logger       | Winston             |
| Dev server   | Nodemon             |

---

## Estrutura de pastas

```
backend/
├── prisma/
│   ├── schema.prisma        ← modelos do banco
│   └── seed.js              ← dados iniciais
└── src/
    ├── config/
    │   ├── env.js            ← variáveis de ambiente validadas
    │   └── prisma.js         ← singleton do PrismaClient
    ├── controllers/
    │   └── contact.controller.js
    ├── middlewares/
    │   ├── auth.js           ← stub JWT (implementar depois)
    │   ├── errorHandler.js
    │   ├── notFound.js
    │   └── validate.js
    ├── routes/
    │   ├── contact.routes.js
    │   └── index.js
    ├── services/
    │   └── contact.service.js
    ├── utils/
    │   ├── ApiError.js
    │   ├── logger.js
    │   └── response.js
    └── server.js
```

---

## 1. Pré-requisitos

- Node.js >= 18 ([nodejs.org](https://nodejs.org))
- PostgreSQL 15+ rodando localmente ou em nuvem (Supabase, Neon, Railway)

---

## 2. Instalação

```bash
# Na raiz do backend
cd backend
npm install
```

---

## 3. Variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e preencha:

```env
DATABASE_URL="postgresql://postgres:SENHA@localhost:5432/loa_design?schema=public"
FRONTEND_URL=http://localhost:5173
JWT_SECRET=uma_string_aleatoria_longa
```

### Criar banco no PostgreSQL

```sql
-- Conecte ao psql e execute:
CREATE DATABASE loa_design;
```

Ou com ferramenta gráfica como DBeaver / TablePlus / pgAdmin.

---

## 4. Prisma — Migrations

```bash
# Gera as tabelas no banco e o Prisma Client
npm run db:migrate

# Nome sugerido para a primeira migration:
# > init_schema
```

Isso cria as tabelas `contacts`, `users`, `packages`, `testimonials` no PostgreSQL.

### Gerar o Prisma Client (quando schema mudar)

```bash
npm run db:generate
```

### Visualizar banco com Prisma Studio

```bash
npm run db:studio
# Abre em http://localhost:5555
```

---

## 5. Seed (dados iniciais)

```bash
npm run db:seed
```

Insere pacotes e depoimentos de exemplo no banco.

---

## 6. Rodar o servidor

```bash
# Desenvolvimento (com hot-reload)
npm run dev

# Produção
npm start
```

Servidor sobe em `http://localhost:3333`

---

## 7. Endpoints disponíveis

| Método | Rota                          | Descrição                      | Auth |
|--------|-------------------------------|--------------------------------|------|
| GET    | /api/health                   | Health check                   | —    |
| POST   | /api/contact                  | Formulário de contato          | —    |
| GET    | /api/contact/admin            | Listar contatos (admin)        | futuro |
| GET    | /api/contact/admin/:id        | Buscar contato por ID          | futuro |
| PATCH  | /api/contact/admin/:id/status | Atualizar status               | futuro |
| DELETE | /api/contact/admin/:id        | Remover contato                | futuro |

### Exemplo de request — POST /api/contact

```json
POST http://localhost:3333/api/contact
Content-Type: application/json

{
  "name": "Ana Beatriz",
  "phone": "54999998888",
  "email": "ana@email.com",
  "instagram": "@anabeatriz",
  "service": "Pacote Intermediário",
  "message": "Olá! Tenho interesse nos serviços da Loa Design Digital."
}
```

### Resposta de sucesso (201)

```json
{
  "success": true,
  "message": "Mensagem recebida com sucesso! Entraremos em contato em breve.",
  "data": {
    "id": "clxxxxxxxxxxxxxxxx"
  }
}
```

### Resposta de erro de validação (422)

```json
{
  "success": false,
  "error": "Dados de entrada inválidos.",
  "details": [
    { "field": "name", "message": "Nome é obrigatório.", "value": "" },
    { "field": "message", "message": "Mensagem é obrigatória.", "value": "" }
  ]
}
```

---

## 8. Frontend — Integração

### Instalar axios no projeto React

```bash
cd frontend
npm install axios
```

### Criar .env.local

```bash
# Na raiz do projeto React
echo "VITE_API_URL=http://localhost:3333/api" > .env.local
```

### Arquivos a copiar para o frontend

| Arquivo                          | Destino no projeto React       |
|----------------------------------|-------------------------------|
| `loa-frontend-api/contact.js`    | `src/api/contact.js`          |
| `loa-frontend-api/ContactSection.jsx` | `src/components/ContactSection.jsx` |
| `loa-frontend-api/.env.local.example` | `.env.local` (renomear) |

---

## 9. Próximos passos (roadmap)

- [ ] Autenticação JWT (login, refresh token, logout)
- [ ] Painel admin com listagem de contatos
- [ ] CRUD de pacotes via painel
- [ ] CRUD de depoimentos via painel
- [ ] Envio de e-mail ao receber contato (Resend / Nodemailer)
- [ ] Rate limiting (express-rate-limit)
- [ ] Deploy (Railway / Render / VPS)

---

## 10. Comandos rápidos

```bash
npm run dev              # Inicia servidor com hot-reload
npm run db:migrate       # Cria/atualiza tabelas no banco
npm run db:generate      # Regenera Prisma Client
npm run db:studio        # Abre interface visual do banco
npm run db:seed          # Popula banco com dados iniciais
npm run db:reset         # Reseta banco (⚠ apaga tudo em dev)
```
