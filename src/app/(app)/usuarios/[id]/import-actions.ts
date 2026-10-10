"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, addDoc, ensureBucket, newDocId, removeDocMeta, findDoc, type DocMeta } from "@/lib/documents";

const MAX = 12 * 1024 * 1024;

// Só aceitamos links do Google Docs / Drive (evita buscar endereços arbitrários pelo servidor).
function googleExport(raw: string): { url: string; kind: "doc" | "file" } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const doc = u.pathname.match(/^\/document\/d\/([\w-]+)/);
  if (u.hostname === "docs.google.com" && doc) {
    return { url: `https://docs.google.com/document/d/${doc[1]}/export?format=docx`, kind: "doc" };
  }
  const file = u.pathname.match(/^\/file\/d\/([\w-]+)/) ?? (u.searchParams.get("id") ? [, u.searchParams.get("id")!] : null);
  if (u.hostname === "drive.google.com" && file?.[1]) {
    return { url: `https://drive.google.com/uc?export=download&id=${file[1]}`, kind: "file" };
  }
  return null;
}

async function extractText(buf: Buffer, ext: string): Promise<string> {
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const r = await parser.getText();
    await parser.destroy();
    return r.text;
  }
  return buf.toString("utf8"); // txt, md
}

const sniffExt = (name: string, type: string) => {
  const e = name.split(".").pop()?.toLowerCase() ?? "";
  if (["docx", "pdf", "txt", "md"].includes(e)) return e;
  if (type.includes("wordprocessingml")) return "docx";
  if (type.includes("pdf")) return "pdf";
  if (type.startsWith("text/")) return "txt";
  return "";
};

export async function importProcess(_: string | null, form: FormData) {
  const me = await requireMember();
  const link = String(form.get("url") ?? "").trim();
  const file = form.get("file");

  let buf: Buffer; let filename: string; let ext: string; let source: DocMeta["source"] = "arquivo"; let sourceUrl: string | undefined;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX) return "Arquivo muito grande (limite de 12 MB).";
    ext = sniffExt(file.name, file.type);
    if (!ext) return "Formato não aceito. Use .docx, .pdf ou .txt.";
    buf = Buffer.from(await file.arrayBuffer());
    filename = file.name;
  } else if (link) {
    const g = googleExport(link);
    if (!g) return "Cole um link do Google Docs (docs.google.com/document/…) ou do Google Drive.";
    const res = await fetch(g.url, { redirect: "follow" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || type.includes("text/html")) {
      return "Não consegui abrir esse documento: ele é privado. No Google Docs, em Compartilhar, deixe “Qualquer pessoa com o link” como leitor e tente de novo. Ou baixe como .docx (Arquivo → Fazer download) e arraste o arquivo aqui.";
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX) return "Arquivo muito grande (limite de 12 MB).";
    buf = bytes;
    ext = g.kind === "doc" ? "docx" : sniffExt("", type) || "pdf";
    const cd = res.headers.get("content-disposition") ?? "";
    const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    filename = m ? decodeURIComponent(m[1]) : `documento.${ext}`;
    source = "google"; sourceUrl = link;
  } else {
    return "Cole um link ou arraste um arquivo.";
  }

  let text: string;
  try { text = (await extractText(buf, ext)).replace(/\r\n/g, "\n").trim(); }
  catch { return "Não consegui ler o conteúdo desse arquivo."; }
  if (!text) return "O arquivo não tem texto legível (PDF escaneado?).";

  const id = newDocId();
  const admin = createAdminClient();
  await ensureBucket();
  const base = `${me.id}/${id}`;
  const up1 = await admin.storage.from(BUCKET).upload(`${base}.${ext}`, buf, { contentType: "application/octet-stream" });
  const up2 = await admin.storage.from(BUCKET).upload(`${base}.txt`, Buffer.from(text, "utf8"), { contentType: "text/plain; charset=utf-8" });
  if (up1.error || up2.error) return "Não foi possível guardar o arquivo no banco de dados.";

  const title = filename.replace(/\.(docx|pdf|txt|md)$/i, "") || text.split("\n")[0].slice(0, 120);
  const r = await addDoc(me.id, {
    id, title, source, source_url: sourceUrl, filename, ext, size: buf.length, chars: text.length,
    created_at: new Date().toISOString(), path_original: `${base}.${ext}`, path_text: `${base}.txt`,
  });
  if (r.error) return "Não foi possível registrar o processo.";
  revalidatePath("/usuarios", "layout");
  return "ok";
}

export async function deleteProcess(form: FormData) {
  const me = await requireMember();
  const found = await findDoc(String(form.get("id")));
  if (!found || (found.ownerId !== me.id && me.role !== "admin")) return;
  await createAdminClient().storage.from(BUCKET).remove([found.doc.path_original, found.doc.path_text]);
  await removeDocMeta(found.ownerId, found.doc.id);
  revalidatePath("/usuarios", "layout");
}
