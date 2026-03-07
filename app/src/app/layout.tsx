import type { Metadata, Viewport } from "next";
import "./globals.css";
import SplashScreen from "@/components/ui/SplashScreen";

export const metadata: Metadata = {
  title: "D&D Campaign Manager",
  description: "Gestisci le tue campagne D&D 5e in presenza",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "D&D Manager",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { AuthProvider } from "@/contexts/AuthContext";
import NextTopLoader from "nextjs-toploader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body>
        <AuthProvider>
          <NextTopLoader
            color="#00e5a0"
            initialPosition={0.08}
            crawlSpeed={200}
            height={3}
            crawl={true}
            showSpinner={false}
            easing="ease"
            speed={200}
            shadow="0 0 10px #00e5a0,0 0 5px #00e5a0"
          />
          <SplashScreen>{children}</SplashScreen>
        </AuthProvider>
      </body>
    </html>
  );
}
