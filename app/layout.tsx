import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Signalboard: customer feedback boards for SaaS teams",
  description: "Collect feature requests, let customers vote, and share a public roadmap.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} min-h-screen antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
