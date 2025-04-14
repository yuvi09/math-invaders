import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Math Invaders',
  description: 'A math learning game',
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full w-full">
      <body className="h-full w-full m-0 p-0 bg-gray-900 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
