import { NextResponse, type NextRequest } from "next/server";

// Guarda o endereço pedido em um cabeçalho: se a pessoa não estiver logada, o login volta para ele
// (ex.: link de relatório compartilhado pelo WhatsApp).
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/|.*\\..*).*)"] };
