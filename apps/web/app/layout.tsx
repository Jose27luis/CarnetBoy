import type { Metadata, Viewport } from 'next';
import { Lexend, Source_Sans_3 } from 'next/font/google';
import './globals.css';

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-lexend',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-source-sans',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="es" className={`${lexend.variable} ${sourceSans.variable}`}>
      <body className="min-h-dvh overflow-x-clip antialiased">{children}</body>
    </html>
  );
}
