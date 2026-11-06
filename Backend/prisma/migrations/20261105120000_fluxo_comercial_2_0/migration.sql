-- ═══════════════════════════════════════════════════════════════════════════
-- Fluxo Comercial Integrado 2.0 — migração ADITIVA.
--
-- Somente CREATE TYPE / CREATE TABLE / CREATE INDEX / FKs entre tabelas NOVAS.
-- Nenhuma tabela legada é alterada, renomeada, removida ou referenciada.
-- Executada em transação única: em caso de erro, nada é aplicado.
-- Reversão (somente se nenhuma informação nova precisar ser mantida):
--   prisma/rollback/20261105120000_fluxo_comercial_2_0.down.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CLIENT', 'PROSPECT');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkProjectStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('ONE_TIME', 'INSTALLMENTS', 'RECURRING');

-- CreateEnum
CREATE TYPE "ReceivableKind" AS ENUM ('ONE_TIME', 'INSTALLMENT', 'RECURRING');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('PENDING', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARD', 'BOLETO', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('MEETING', 'DELIVERY', 'DEADLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('SCHEDULED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "commercial_contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "email" TEXT,
    "emailNormalized" TEXT,
    "type" "ContactType" NOT NULL DEFAULT 'PROSPECT',
    "source" TEXT,
    "notes" TEXT,
    "convertedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "legacyLeadId" TEXT,
    "legacyClientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "serviceId" TEXT,
    "serviceName" TEXT,
    "estimatedValue" DECIMAL(12,2),
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_projects" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "proposalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "contractedValue" DECIMAL(12,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "status" "WorkProjectStatus" NOT NULL DEFAULT 'PLANNED',
    "startDate" DATE,
    "dueDate" DATE,
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_agreements" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "RecurringStatus" NOT NULL DEFAULT 'ACTIVE',
    "paymentMethod" "PaymentMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "recurringId" TEXT,
    "kind" "ReceivableKind" NOT NULL,
    "installmentNumber" INTEGER,
    "installmentCount" INTEGER,
    "competence" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "receivedAt" DATE,
    "receivedAmount" DECIMAL(12,2),
    "transactionId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL DEFAULT 'OTHER',
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "notes" TEXT,
    "contactId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commercial_contacts_legacyLeadId_key" ON "commercial_contacts"("legacyLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "commercial_contacts_legacyClientId_key" ON "commercial_contacts"("legacyClientId");

-- CreateIndex
CREATE INDEX "commercial_contacts_phoneNormalized_idx" ON "commercial_contacts"("phoneNormalized");

-- CreateIndex
CREATE INDEX "commercial_contacts_emailNormalized_idx" ON "commercial_contacts"("emailNormalized");

-- CreateIndex
CREATE INDEX "commercial_contacts_type_archivedAt_idx" ON "commercial_contacts"("type", "archivedAt");

-- CreateIndex
CREATE INDEX "proposals_status_createdAt_idx" ON "proposals"("status", "createdAt");

-- CreateIndex
CREATE INDEX "proposals_contactId_idx" ON "proposals"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "work_projects_proposalId_key" ON "work_projects"("proposalId");

-- CreateIndex
CREATE INDEX "work_projects_status_idx" ON "work_projects"("status");

-- CreateIndex
CREATE INDEX "work_projects_contactId_idx" ON "work_projects"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_agreements_projectId_key" ON "recurring_agreements"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "receivables_transactionId_key" ON "receivables"("transactionId");

-- CreateIndex
CREATE INDEX "receivables_status_dueDate_idx" ON "receivables"("status", "dueDate");

-- CreateIndex
CREATE INDEX "receivables_contactId_idx" ON "receivables"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "receivables_projectId_installmentNumber_key" ON "receivables"("projectId", "installmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "receivables_recurringId_competence_key" ON "receivables"("recurringId", "competence");

-- CreateIndex
CREATE INDEX "calendar_events_startsAt_idx" ON "calendar_events"("startsAt");

-- CreateIndex
CREATE INDEX "calendar_events_status_idx" ON "calendar_events"("status");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_entityId_createdAt_idx" ON "activity_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "commercial_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_projects" ADD CONSTRAINT "work_projects_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "commercial_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_projects" ADD CONSTRAINT "work_projects_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_agreements" ADD CONSTRAINT "recurring_agreements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "work_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_agreements" ADD CONSTRAINT "recurring_agreements_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "commercial_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "commercial_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "work_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "recurring_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "commercial_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "work_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
