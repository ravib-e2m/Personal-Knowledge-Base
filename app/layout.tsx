import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Second Brain - Personal Knowledge Base',
  description: 'Your AI-powered second brain. Organize documents, save notes, ingest URLs, and chat with your knowledge base semantically.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-[#0d0e12] text-white flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
