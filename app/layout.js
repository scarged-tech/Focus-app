import { Manrope } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata = {
  title: "Focus — Productividad personal",
  description: "Tareas, hábitos, finanzas, entrenamiento y estudios en un solo lugar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Focus",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // respeta el notch/safe-area en iPhone
};

// Layout raíz: estructura HTML base + PWA (instalable en iOS/Android)
// + registro del service worker. La sidebar vive en el layout del
// grupo (app), para que /login no la muestre.
export default function RootLayout({ children }) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="font-sans bg-base text-silver antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
