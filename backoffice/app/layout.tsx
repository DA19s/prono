import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pronocan - Backoffice Admin",
  description: "Interface d'administration pour Pronocan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
