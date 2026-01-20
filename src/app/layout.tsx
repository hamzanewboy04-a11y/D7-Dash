import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "D7 Team Dashboard",
  description: "Financial dashboard for D7 Team - tracking revenue, expenses, and payroll across multiple countries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
