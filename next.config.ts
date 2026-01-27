import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Otimizações para evitar travamentos
  reactStrictMode: true,
  output: "standalone",
  
  // Configuração do Turbopack (Next.js 16+)
  turbopack: {},
  
  // Headers para melhorar estabilidade
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
