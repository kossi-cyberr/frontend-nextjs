import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Génère .next/standalone pour le déploiement Docker (serveur Node autonome)
  output: "standalone",
  turbopack: {
    // Racine explicite : des lockfiles existent au niveau du dossier parent,
    // ce qui induisait Next.js en erreur sur la détection du workspace.
    root: process.cwd(),
  },
};

export default nextConfig;
