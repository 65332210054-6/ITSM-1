export const runtime = 'edge'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ITSM & Asset Management",
  description: "Enterprise IT Service and Asset Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
