// src/api/packages.js
// ─────────────────────────────────────────────────────────────────────────────
// Cliente de API para o recurso público de Pacotes/Serviços.
// Consome GET /api/services/public — apenas serviços ativos, sem preço.
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Lista os pacotes ativos para exibição pública.
 * O backend já filtra `active: true` e omite o campo `price`.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   name: string,
 *   slug: string,
 *   description: string,
 *   items: string[],
 *   featured: boolean,
 *   active: boolean,
 * }>>}
 */
export async function fetchPublicPackages() {
  const { data } = await api.get("/services/public");
  return data.data ?? [];
}
