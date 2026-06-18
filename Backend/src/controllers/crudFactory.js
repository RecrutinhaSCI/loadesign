// src/controllers/crudFactory.js
// ─────────────────────────────────────────────────────────────────────────────
// Fábrica genérica de controllers CRUD para qualquer model Prisma.
//
// Devolve { list, show, create, update, remove } prontos para usar em router.
// Hooks opcionais permitem customizar transformação de payload por entidade
// (ex: converter array→JSON.stringify para Lead.tags).
// ─────────────────────────────────────────────────────────────────────────────

const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { success, created } = require("../utils/response");

/**
 * @param {object} opts
 * @param {object} opts.model           - prisma[model] delegate
 * @param {string[]} [opts.requiredFields] - campos obrigatórios no create
 * @param {(body) => object} [opts.transformIn]  - normaliza payload entrando
 * @param {(record) => object} [opts.transformOut] - normaliza payload saindo
 * @param {object} [opts.orderBy] - ordenação default na listagem
 */
function createCrudController({
  model,
  requiredFields = [],
  transformIn = (b) => b,
  transformOut = (r) => r,
  orderBy = { createdAt: "desc" },
}) {
  const out = (rec) => (Array.isArray(rec) ? rec.map(transformOut) : transformOut(rec));

  const list = asyncHandler(async (_req, res) => {
    const records = await model.findMany({ orderBy });
    return success(res, out(records));
  });

  const show = asyncHandler(async (req, res) => {
    const record = await model.findUnique({ where: { id: req.params.id } });
    if (!record) throw ApiError.notFound("Registro não encontrado.");
    return success(res, out(record));
  });

  const create = asyncHandler(async (req, res) => {
    const body = req.body || {};
    for (const f of requiredFields) {
      if (body[f] === undefined || body[f] === null || body[f] === "") {
        throw ApiError.badRequest(`Campo obrigatório: ${f}`);
      }
    }
    const data = transformIn(body);
    const record = await model.create({ data });
    return created(res, out(record));
  });

  const update = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const data = transformIn(body);
    // Não permite sobrescrever id/createdAt manualmente
    delete data.id;
    delete data.createdAt;
    const record = await model.update({ where: { id: req.params.id }, data });
    return success(res, out(record), "Atualizado com sucesso.");
  });

  const remove = asyncHandler(async (req, res) => {
    await model.delete({ where: { id: req.params.id } });
    return success(res, null, "Removido com sucesso.");
  });

  return { list, show, create, update, remove };
}

module.exports = { createCrudController };
