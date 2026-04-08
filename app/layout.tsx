import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Kakmell Resources",
  description: "Sistem Pengurusan Perniagaan Katering",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" className={inter.variable}>
      <body className="antialiased bg-white text-gray-900">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
