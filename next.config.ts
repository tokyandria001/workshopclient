import type { NextConfig } from "next";

import { RESOURCE_BUCKET } from "./src/lib/resource-images";

// Seules les photos du bucket public de notre projet de stockage sont
// autorisées pour l'optimisation d'images de Next.js.
const storageHost = process.env.STORAGE_URL
  ? new URL(process.env.STORAGE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Envoi de photos (4 Mo max chacune) via une action serveur.
      // Reste sous la limite de 4,5 Mo des fonctions Vercel.
      bodySizeLimit: "4.5mb",
    },
  },
  images: {
    remotePatterns: storageHost
      ? [
          {
            protocol: "https",
            hostname: storageHost,
            pathname: `/storage/v1/object/public/${RESOURCE_BUCKET}/**`,
          },
        ]
      : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
