import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Familien-Essensplaner",
  description: "Wöchentlicher Essensplan für die Familie",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="app-wrapper">{children}</div>
      </body>
    </html>
  );
}
