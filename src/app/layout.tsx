import type { Metadata } from "next";
import { ThemeProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "A + A Adventure",
  description: "Our couple's trip planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased transition-colors duration-300">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}