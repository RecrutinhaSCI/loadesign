// src/utils/phone.js
// Normalização de telefone para busca e detecção de duplicidade.
// Mantém só dígitos; remove o código do Brasil (55) e zeros de discagem.

function normalizePhone(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

const isValidPhone = (normalized) => normalized.length >= 8 && normalized.length <= 13;

const normalizeEmail = (raw) => {
  const s = String(raw || "").trim().toLowerCase();
  return s || null;
};

module.exports = { normalizePhone, isValidPhone, normalizeEmail };
