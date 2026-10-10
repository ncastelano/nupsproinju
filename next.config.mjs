export default {
  // arquivos de processo são enviados por ação do servidor (arrastar e soltar)
  experimental: { serverActions: { bodySizeLimit: "15mb" } },
  serverExternalPackages: ["pdf-parse", "mammoth"],
};
