import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permite subir archivos Excel de hasta 5 MB en la importación de atenciones
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
