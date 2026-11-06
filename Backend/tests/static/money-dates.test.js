// Testes puros: dinheiro em centavos, parcelas e datas de calendário.
const test = require("node:test");
const assert = require("node:assert/strict");
const { toCents, fromCents, splitCents } = require("../../src/utils/money");
const {
  parseDateOnly, formatDateOnly, addMonthsClamped, competenceDueDate,
  competencesBetween, todayBR, addCompetence,
} = require("../../src/utils/dates");
const { normalizePhone } = require("../../src/utils/phone");

test("toCents aceita formatos brasileiros e números sem erro de ponto flutuante", () => {
  assert.equal(toCents(1234.56), 123456);
  assert.equal(toCents("1234,56"), 123456);
  assert.equal(toCents("1.234,56"), 123456);
  assert.equal(toCents("R$ 1.234,5"), 123450);
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(toCents("10"), 1000);
  assert.equal(toCents("abc"), null);
  assert.equal(toCents("1,234"), null);
  assert.equal(fromCents(123456), "1234.56");
  assert.equal(fromCents(5), "0.05");
});

test("splitCents: soma exata e centavos distribuídos nas primeiras parcelas", () => {
  assert.deepEqual(splitCents(100000, 3), [33334, 33333, 33333]);
  assert.deepEqual(splitCents(1000, 3), [334, 333, 333]);
  assert.deepEqual(splitCents(200, 4), [50, 50, 50, 50]);
  for (const [total, n] of [[99999, 7], [1, 3], [12345678, 12], [100, 48]]) {
    const parts = splitCents(total, n);
    assert.equal(parts.length, n);
    assert.equal(parts.reduce((a, b) => a + b, 0), total);
    assert.ok(Math.max(...parts) - Math.min(...parts) <= 1);
  }
});

test("datas de calendário não dependem do fuso", () => {
  const d = parseDateOnly("2026-03-31");
  assert.equal(formatDateOnly(d), "2026-03-31");
  assert.equal(parseDateOnly("2026-02-30"), null);
  assert.equal(parseDateOnly("31/03/2026"), null);
  assert.match(todayBR(), /^\d{4}-\d{2}-\d{2}$/);
  // 23h30 em São Paulo de 31/12 ainda é 31/12, mesmo já sendo 01/01 em UTC
  assert.equal(todayBR(new Date("2027-01-01T02:30:00Z")), "2026-12-31");
});

test("parcelas mensais preservam o dia e respeitam meses curtos", () => {
  const first = parseDateOnly("2026-01-31");
  const dates = [0, 1, 2, 3].map((i) => formatDateOnly(addMonthsClamped(first, i)));
  assert.deepEqual(dates, ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  assert.equal(formatDateOnly(addMonthsClamped(parseDateOnly("2027-12-15"), 2)), "2028-02-15");
});

test("mensalidade: dia 29/30/31 cai no último dia do mês curto", () => {
  assert.equal(formatDateOnly(competenceDueDate("2027-02", 31)), "2027-02-28");
  assert.equal(formatDateOnly(competenceDueDate("2028-02", 30)), "2028-02-29");
  assert.equal(formatDateOnly(competenceDueDate("2026-04", 31)), "2026-04-30");
  assert.equal(formatDateOnly(competenceDueDate("2026-05", 10)), "2026-05-10");
  assert.deepEqual(competencesBetween("2026-11", "2027-02"), ["2026-11", "2026-12", "2027-01", "2027-02"]);
  assert.equal(addCompetence("2026-12", 1), "2027-01");
});

test("telefone normalizado remove máscara, DDI 55 e zero de discagem", () => {
  assert.equal(normalizePhone("(54) 99999-1234"), "54999991234");
  assert.equal(normalizePhone("+55 54 99999-1234"), "54999991234");
  assert.equal(normalizePhone("054 99999-1234"), "54999991234");
});
