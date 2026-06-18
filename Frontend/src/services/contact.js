// src/api/contact.js
// ─────────────────────────────────────────────────────────────────────────────
// Cliente de API para o recurso Contact.
// Centraliza todas as chamadas ao backend — fácil trocar a URL ou adicionar
// interceptors de autenticação no futuro.
//
// Instalar: npm install axios
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

// A URL base vem da variável de ambiente do Vite.
// Em .env.local: VITE_API_URL=http://localhost:3333/api
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Interceptor de resposta (futuro: adicionar refresh token aqui) ────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Re-lança com mensagem legível
    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      "Erro desconhecido";
    const details = error.response?.data?.details ?? null;
    const status  = error.response?.status ?? 0;

    const err = new Error(message);
    err.status  = status;
    err.details = details;
    return Promise.reject(err);
  }
);

// ── Contact API ───────────────────────────────────────────────────────────────

/**
 * Envia o formulário de contato para o backend.
 *
 * @param {{
 *   name:      string,
 *   phone:     string,
 *   email?:    string,
 *   instagram?: string,
 *   service?:  string,
 *   message:   string,
 * }} formData
 *
 * @returns {Promise<{ id: string }>}
 */
export async function submitContact(formData) {
  const { data } = await api.post("/contact", formData);
  return data.data; // { id: "..." }
}

export default api;
