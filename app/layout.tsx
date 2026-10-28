import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDF Tools - Merge, Split, Rotate & Reorder PDF Pages',
  description: 'Fast, secure, and modern PDF editing in your browser. Reorder, rotate, delete, split, and merge PDFs locally.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
