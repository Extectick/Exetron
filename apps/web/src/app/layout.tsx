import type { Metadata } from "next";
import { IBM_Plex_Mono, Sora } from "next/font/google";
import { createElement, type ReactNode } from "react";
import { AuthProvider } from "../components/auth-provider";
import "antd/dist/reset.css";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora"
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Exetron Admin",
  description: "Refine-powered Exetron administration workspace"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${sora.variable} ${mono.variable}`}>
        {createElement(AuthProvider, null, children)}
      </body>
    </html>
  );
}
