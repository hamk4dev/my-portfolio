import './globals.css';

export const metadata = {
  title: 'Init.CV',
  description: 'Interactive portofolio with terminal-style navigation and AI tools.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
