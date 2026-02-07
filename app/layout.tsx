import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ACSAI - Workflow Automation",
  description: "Automate your x_workflows with AI-powered automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" title="test">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

