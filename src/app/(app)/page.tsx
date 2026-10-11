import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { ensureSlug } from "@/lib/profiles";

// Página inicial: o perfil da própria pessoa.
export default async function Home() {
  const m = await requireMember();
  const slug = await ensureSlug({ id: m.id, name: m.name, email: m.email, profileslug: m.profileslug });
  redirect(`/${slug}`);
}
