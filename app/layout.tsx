import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/use-theme";
import "./globals.css";

// Roda antes da hidratação pra evitar o "flash" de tema claro em quem
// escolheu escuro — sem isso, a tela pisca clara por uma fração de segundo
// toda vez, já que o ThemeProvider só consegue aplicar data-theme depois de
// montar. Só lê o cache local (o Firestore é a fonte da verdade, mas é
// assíncrono demais pra rodar antes do primeiro paint).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("temaPreferencia");
    var dark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Projeto Dinheiro",
  description: "Um site para administração financeira",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dinheiro",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Sem isso, os env(safe-area-inset-*) usados no cabeçalho, no menu lateral
  // e no botão de adicionar ficam sempre em 0 no iOS (o conteúdo só passa a
  // desenhar por baixo do notch/da barra de gestos quando o viewport cobre a
  // tela toda).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-br"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
