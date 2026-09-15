import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Levia",
  description: "Seu acompanhamento inteligente de hábitos e evolução."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
