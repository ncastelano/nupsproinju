import { UserRound } from "lucide-react";

export function Avatar({ url, size = 32 }: { url: string | null; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" width={size} height={size} /> : <UserRound size={Math.round(size * 0.6)} />}
    </span>
  );
}
