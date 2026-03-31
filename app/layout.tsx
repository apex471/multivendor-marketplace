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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark') {
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
