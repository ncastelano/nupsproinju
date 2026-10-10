import { UserRound } from "lucide-react";

export function Avatar({ url, size = 32, onLight = false }: { url: string | null; size?: number; onLight?: boolean }) {
  return (
    <span className={`avatar${onLight ? " on-light" : ""}`} style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" width={size} height={size} /> : <UserRound size={Math.round(size * 0.6)} />}
    </span>
  );
}
