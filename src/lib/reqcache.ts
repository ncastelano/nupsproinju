import { cache } from "react";

// Dados que já buscamos nesta requisição (um por pedido), para não repetir ida ao banco.
export const metaStore = cache(() => new Map<string, Record<string, unknown>>());
