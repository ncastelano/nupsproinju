import { redirect } from "next/navigation";

// Endereço antigo: a página agora é /cadastrar-pessoa.
export default async function Old({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  redirect(`/cadastrar-pessoa${qs ? `?${qs}` : ""}`);
}
