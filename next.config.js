/** @type {import('next').NextConfig} */
const nextConfig = {
  // Redireciona /api/* para o FastAPI rodando na porta 8000.
  // O frontend nunca precisa conhecer a porta da API — tudo passa por /api.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
