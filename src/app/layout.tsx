import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ETICE — Contratos de Nuvem",
  description: "Painel de gestão de contratos de fornecedores de nuvem da ETICE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
