import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin usa módulos nativos do Node — deixa fora do bundle do servidor.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
