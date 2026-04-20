import type { ReactNode } from "react";

export const metadata = {
  title: "closelyst",
  description: "Termin-/No-Show Reduzierer für Praxen & Salons"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
