import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: {
    default: "Stepwise — сколько путей поступления у тебя ещё открыто",
    template: "%s · Stepwise",
  },
  description:
    "Stepwise считает, какие пути поступления тебе ещё доступны, когда каждый из них закроется и какое одно действие удерживает максимум вариантов.",
  applicationName: "Stepwise",
};

export const viewport: Viewport = {
  // Одно значение, а не пара под prefers-color-scheme: продукт стартует
  // тёмным независимо от системы (см. `components/theme-provider.tsx`), и
  // светлая полоса вокруг чёрной страницы на телефоне — это заметно.
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
          >
            К основному содержимому
          </a>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
