import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My AI News",
  description: "Your Personal AI News Editor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white">{children}</body>
    </html>
  );
}
