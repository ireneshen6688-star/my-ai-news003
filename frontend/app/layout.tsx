import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My AI News — Your Personal AI News Digest",
  description: "Get AI-curated news digests tailored to your keywords, delivered on your schedule.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-background text-gray-900 antialiased">{children}</body>
    </html>
  );
}
