import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permite subir archivos Excel de hasta 5 MB en la importación de atenciones y del libro contable
    serverActions: { bodySizeLimit: "16mb" },
  },
};

export default nextConfig;
