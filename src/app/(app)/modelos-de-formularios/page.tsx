import Link from "next/link";
import { Check, Eye, LayoutTemplate, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BASE_ID, getActiveTemplate, listTemplates } from "@/lib/templates";
import { CreateTemplate } from "@/components/CreateTemplate";
import { deleteTemplate, useTemplate } from "../formulario/custom-actions";

export default async function ModelosPage() {
  const me = await requireMember();
  const [templates, active] = await Promise.all([listTemplates(), getActiveTemplate(me.id)]);

  // nome atual de cada autor
  const { data: members } = await createAdminClient().from("members").select("id, name");
  const names = new Map((members ?? []).map((m) => [m.id as string, m.name as string]));

  const count = (t: (typeof templates)[number]) =>
    Object.values(t.forms).reduce((n, f) => n + f.questions.length + Object.keys(f.overrides).length, 0);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div>
        <h1 style={{ margin: "8px 0 0" }}>Modelos de formulários</h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
          Veja os modelos antes de começar e escolha qual usar. Ao acrescentar uma pergunta a um
          modelo de outra pessoa, ele vira um formulário seu e aparece aqui para todos.
        </p>
      </div>

      <CreateTemplate />

      <div className="user-grid">
        {templates.map((t) => {
          const isActive = t.id === active.id;
          const mine = t.owner_id === me.id;
          const owner = t.id === BASE_ID ? "Núcleo Psicossocial" : names.get(t.owner_id) || t.owner_name;
          const extra = count(t);
          return (
            <article key={t.id} className={`card user-card${isActive ? " active-card" : ""}`}>
              <div className="ico-sm"><LayoutTemplate size={20} /></div>
              <h3>{t.name}</h3>
              <p>de {owner}{mine && t.id !== BASE_ID ? " (você)" : ""}</p>
              <p>
                {t.id === BASE_ID
                  ? "Perguntas originais do núcleo."
                  : `${extra} ${extra === 1 ? "alteração" : "alterações"} sobre ${t.parent_name ?? "o modelo padrão"}.`}
              </p>
              {isActive && <span className="badge"><Check size={12} style={{ verticalAlign: "-2px" }} /> Em uso por você</span>}
              <div className="row" style={{ marginTop: 8 }}>
                <Link href={`/modelos-de-formularios/${t.id}`}>
                  <button className="ghost"><Eye size={16} /> Ver perguntas</button>
                </Link>
                {!isActive && (
                  <form action={useTemplate}>
                    <input type="hidden" name="id" value={t.id} />
                    <button>Usar este formulário</button>
                  </form>
                )}
                {isActive && (
                  <Link href="/formulario"><button>Preencher</button></Link>
                )}
                {mine && t.id !== BASE_ID && (
                  <form action={deleteTemplate}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="danger" aria-label="Apagar formulário"><Trash2 size={16} /></button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
