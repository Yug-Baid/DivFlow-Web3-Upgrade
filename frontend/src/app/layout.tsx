import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DivFlow | Decentralized Land Registry",
  description: "Secure, Transparent, and Efficient Land Registration on Blockchain",
};

import { Navbar } from "@/components/Navbar";
import { Providers } from "./providers";
import NoSSR from "@/components/NoSSR";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <NoSSR>
             <Navbar />
          </NoSSR>
          {children}
        </Providers>
      </body>
    </html>
  );
}
