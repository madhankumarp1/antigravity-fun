import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Antigravity Fun | Random Video Chat",
  description: "Experience random video chat with zero gravity. Connect with strangers worldwide in a premium, secure environment. The best alternative to Omegle.",
  keywords: ["video chat", "random chat", "omegle alternative", "cam chat", "stranger chat", "free video chat", "meet strangers"],
  authors: [{ name: "Antigravity Fun" }],
  creator: "Antigravity Fun",
  publisher: "Antigravity Fun",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Antigravity Fun | Random Video Chat",
    description: "Connect with strangers worldwide in a premium, secure environment.",
    url: "https://antigravity.fun",
    siteName: "Antigravity Fun",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Antigravity Fun - Random Video Chat',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Antigravity Fun",
    description: "Random video chat with zero gravity.",
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://antigravity.fun',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        ></script>

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://antigravity.fun/#organization",
                  "name": "Antigravity Fun",
                  "url": "https://antigravity.fun",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://antigravity.fun/logo.png"
                  },
                  "sameAs": []
                },
                {
                  "@type": "WebSite",
                  "@id": "https://antigravity.fun/#website",
                  "url": "https://antigravity.fun",
                  "name": "Antigravity Fun",
                  "description": "Random video chat with strangers worldwide",
                  "publisher": {
                    "@id": "https://antigravity.fun/#organization"
                  },
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://antigravity.fun/video",
                    "query-input": "required name=search_term_string"
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
