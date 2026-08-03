import "./globals.css";

export const metadata = {
  title: "MABB Registration 2026/27",
  description: "Midland Area Basketball Board - club registration for the 2026/27 season",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-stone-100 min-h-screen" style={{ fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
