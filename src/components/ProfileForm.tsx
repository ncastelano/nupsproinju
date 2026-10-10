"use client";
import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, ChevronDown } from "lucide-react";
import { updateProfile, uploadAvatar } from "@/app/(app)/profile-actions";
import { PasswordInput } from "@/components/PasswordInput";
import { Avatar } from "@/components/Avatar";

export type Professional = { name: string; registry: string };

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
  name, avatarUrl, registry,
}: { name: string; avatarUrl: string | null; registry: string }) {
  const [msg, action, pending] = useActionState(updateProfile, null);
  const [pw, setPw] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

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

      <label className="field">
        <span>Registro profissional (CRP ou CRESS)</span>
        <input
          name="registry"
          defaultValue={registry}
          placeholder="Ex.: CRP 24/00000 ou CRESS 0000/RO"
          autoFocus={!registry}
          required
        />
        {!registry && <small className="sheet-sub">Informe o seu registro para liberar o formulário.</small>}
      </label>

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
