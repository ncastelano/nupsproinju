import { parseDocx } from "@/lib/docxDoc";
import { docToPdf } from "@/lib/docxPdf";

// Resposta de download: .docx (padrão) ou PDF (?formato=pdf).
export async function docResponse(req: Request, buf: Buffer, baseName: string): Promise<Response> {
  const pdf = new URL(req.url).searchParams.get("formato") === "pdf";
  const clean = baseName.replace(/[^\wÀ-ÿ ;\-]+/g, "").trim().slice(0, 80) || "documento";
  if (pdf) {
    const bytes = await docToPdf(await parseDocx(buf));
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${clean}.pdf`)}`,
      },
    });
  }
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${clean}.docx`)}`,
    },
  });
}
