import { LogOut } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { ensureSlug } from "@/lib/profiles";
import { ProfileForm } from "@/components/ProfileForm";
import { logout } from "@/app/login/actions";

// Editar o próprio perfil: foto, nome, endereço do perfil, registro profissional e senha.
export default async function EditarPerfil() {
  const m = await requireMember();
  const slug = await ensureSlug({ id: m.id, name: m.name, email: m.email, profileslug: m.profileslug });
  return (
    <div className="grid" style={{ gap: 14, maxWidth: 560 }}>
      <div>
        <h1 style={{ margin: "8px 0 0" }}>Editar perfil</h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{m.email}</p>
      </div>
      <div className="card profile-page">
        <ProfileForm name={m.name} avatarUrl={m.avatar_url ?? null} registry={m.registry ?? ""} profileslug={slug} />
      </div>
      <form action={logout}><button className="ghost"><LogOut size={18} /> Sair</button></form>
    </div>
  );
}
