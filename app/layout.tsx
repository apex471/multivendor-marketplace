import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { LocationProvider } from "../contexts/LocationContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { CheckoutProvider } from "../contexts/CheckoutContext";
import { LogisticsProvider } from "../contexts/LogisticsContext";
import { CartProvider } from "../contexts/CartContext";
import GoogleOAuthProviderWrapper from "@/components/providers/GoogleOAuthProvider";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

const poppins = Poppins({ 
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: "CLW - Certified Luxury World | Premium Luxury Marketplace",
  description: "Certified Luxury World (CLW) - Your premier destination for authentic luxury products. Shop from certified vendors, share your refined style, and connect with luxury connoisseurs worldwide.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://certifiedluxuryworld.com'),
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'CLW - Certified Luxury World | Premium Luxury Marketplace',
    description: 'Your premier destination for authentic luxury products. Shop from certified vendors, share your refined style, and connect with luxury connoisseurs worldwide.',
    url: '/',
    siteName: 'Certified Luxury World',
    images: [
      {
        url: '/images/brand/clw-banner1.jpg',
        width: 1280,
        height: 708,
        alt: 'Certified Luxury World - Premium Luxury Marketplace',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CLW - Certified Luxury World',
    description: 'Your premier destination for authentic luxury products.',
    images: ['/images/brand/clw-banner1.jpg'],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                // Default to dark; only remove if user explicitly chose light
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased bg-white dark:bg-charcoal-950 text-charcoal-900 dark:text-white transition-colors duration-200`}>
        <GoogleOAuthProviderWrapper>
          <ThemeProvider>
            <AuthProvider>
              <CartProvider>
                <LocationProvider>
                  <CheckoutProvider>
                    <LogisticsProvider>
                      {children}
                    </LogisticsProvider>
                  </CheckoutProvider>
                </LocationProvider>
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </GoogleOAuthProviderWrapper>
      </body>
    </html>
  );
}
