import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Carnet CRED',
    template: '%s | Carnet CRED',
  },
  description: 'Carnet digital de crecimiento, vacunación y anemia de niñas y niños.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0b7fb3',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="es" className={`${poppins.variable} ${inter.variable}`}>
      <body className="min-h-dvh overflow-x-clip antialiased">{children}</body>
    </html>
  );
}
