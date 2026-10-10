"use client";
import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, ChevronDown } from "lucide-react";
import { updateProfile, uploadAvatar } from "@/app/(app)/actions";
import { PasswordInput } from "@/components/PasswordInput";
import { Avatar } from "@/components/Avatar";

export type Professional = { id: string; name: string; registry: string };

// Reduz a foto no navegador (256x256, recorte central) antes de enviar.
async function resize(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const side = Math.min(bmp.width, bmp.height);
  canvas.getContext("2d")!.drawImage(
    bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size,
  );
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.85));
}

export function ProfileForm({
  name, avatarUrl, linked, available,
}: { name: string; avatarUrl: string | null; linked: Professional | null; available: Professional[] }) {
  const [msg, action, pending] = useActionState(updateProfile, null);
  const [typed, setTyped] = useState("");
  const [pw, setPw] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const isNew =
    typed.trim() !== "" && !available.some((p) => p.name.toLowerCase() === typed.trim().toLowerCase());

  function onPhoto(file?: File) {
    if (!file) return;
    startUpload(async () => {
      try {
        const fd = new FormData();
        fd.append("avatar", await resize(file), "avatar.jpg");
        const r = await uploadAvatar(fd);
        setPhotoMsg(r === "ok" ? null : r);
      } catch { setPhotoMsg("Não foi possível ler essa imagem."); }
    });
  }

  return (
    <form action={action} className="grid" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
        <Avatar url={avatarUrl} size={72} />
        <div className="grid" style={{ gap: 4 }}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
          <button type="button" className="light" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <Camera size={18} /> {uploading ? "Enviando..." : avatarUrl ? "Trocar foto" : "Adicionar foto"}
          </button>
          {photoMsg && <span className="sheet-sub">{photoMsg}</span>}
        </div>
      </div>

      <label className="field">
        <span>Nome</span>
        <input name="name" defaultValue={name} placeholder="Nome completo" required />
      </label>

      {linked ? (
        <div className="field">
          <span>Profissional do NUPS</span>
          <div className="linked">{linked.name} · {linked.registry}</div>
        </div>
      ) : (
        <>
          <label className="field">
            <span>Quem é você no NUPS?</span>
            <input
              name="professional_name"
              list="nups-list"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Escolha da lista ou escreva o seu nome"
              autoComplete="off"
            />
            <datalist id="nups-list">
              {available.map((p) => <option key={p.id} value={p.name}>{p.registry}</option>)}
            </datalist>
          </label>
          {isNew && (
            <label className="field">
              <span>Registro profissional (CRP/CRESS)</span>
              <input name="professional_registry" placeholder="Ex.: CRP 24/00000" />
              <small className="sheet-sub">Esse nome será adicionado à lista do NUPS.</small>
            </label>
          )}
        </>
      )}

      <button type="button" className="light pw-trigger" aria-expanded={pw} onClick={() => setPw((v) => !v)}>
        Trocar senha? <ChevronDown size={18} style={{ transform: pw ? "rotate(180deg)" : undefined, transition: "transform .3s" }} />
      </button>
      <div className={`collapse${pw ? " open" : ""}`}>
        <div>
          {pw && (
            <div className="grid" style={{ gap: 12 }}>
              <label className="field"><span>Nova senha</span>
                <PasswordInput name="password" placeholder="Mínimo 6 caracteres" minLength={6} autoComplete="new-password" /></label>
              <label className="field"><span>Confirmar senha</span>
                <PasswordInput name="confirm_password" placeholder="Repita a nova senha" minLength={6} autoComplete="new-password" /></label>
            </div>
          )}
        </div>
      </div>

      <button disabled={pending}>{pending ? "Salvando..." : "Salvar alterações"}</button>
      {msg === "ok" && <p className="ok">Dados atualizados.</p>}
      {msg && msg !== "ok" && <p className="error">{msg}</p>}
    </form>
  );
}
