-- ═══════════════════════════════════════════════════════════════════════════
-- REVERSÃO da migração 20261105120000_fluxo_comercial_2_0
--
-- ⚠ DESTRUTIVO PARA OS DADOS NOVOS: remove as tabelas do Fluxo Comercial 2.0
-- (contatos, orçamentos novos, projetos oficializados, cobranças, agenda,
-- histórico). NÃO toca em nenhuma tabela legada.
--
-- Use SOMENTE se:
--   1) o rollback de código não for suficiente (o backend antigo ignora estas
--      tabelas; normalmente basta voltar o código), E
--   2) houver autorização explícita, E
--   3) os dados novos tiverem sido exportados ou forem descartáveis.
--
-- Nunca executar em produção sem backup verificado e aprovação.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DROP TABLE "activity_logs";
DROP TABLE "calendar_events";
DROP TABLE "receivables";
DROP TABLE "recurring_agreements";
DROP TABLE "work_projects";
DROP TABLE "proposals";
DROP TABLE "commercial_contacts";

DROP TYPE "CalendarEventStatus";
DROP TYPE "CalendarEventType";
DROP TYPE "RecurringStatus";
DROP TYPE "PaymentMethod";
DROP TYPE "ReceivableStatus";
DROP TYPE "ReceivableKind";
DROP TYPE "PaymentMode";
DROP TYPE "WorkProjectStatus";
DROP TYPE "ProposalStatus";
DROP TYPE "ContactType";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261105120000_fluxo_comercial_2_0';

COMMIT;
