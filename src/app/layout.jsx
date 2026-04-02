import './globals.css';

export const metadata = {
  title: 'Init.CV',
  description: 'Portofolio interaktif dengan navigasi terminal, presentasi proyek, dan tool AI terintegrasi.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
