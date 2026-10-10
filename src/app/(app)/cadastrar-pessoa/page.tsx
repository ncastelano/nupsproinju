import { redirect } from "next/navigation";

// Endereço antigo: o formulário agora é /cadastro-inicial.
export default async function Old({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  redirect(`/cadastro-inicial${qs ? `?${qs}` : ""}`);
}
