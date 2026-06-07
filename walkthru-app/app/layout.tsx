import type { Metadata } from "next";
import { inter, martina } from "./fonts";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Walkthru — Ship code your team actually understands",
  description:
    "A comprehension layer on top of your git history. Visualize every branch, PR, and commit, ask questions grounded in the real diff, and prove you understood your code before it ships.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${martina.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
