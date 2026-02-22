import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Dubai Adventure",
  description: "Couple's trip planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}