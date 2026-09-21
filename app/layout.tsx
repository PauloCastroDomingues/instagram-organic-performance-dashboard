import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reise Social Performance",
  description: "Dashboard de performance orgânica do Instagram da Reise"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
