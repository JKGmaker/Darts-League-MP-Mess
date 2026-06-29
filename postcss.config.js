import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MP Mess Darts League',
  description: 'Official league table, fixtures, and results for the MP Mess Darts League.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-charcoal-950 antialiased">
        {children}
      </body>
    </html>
  );
}
