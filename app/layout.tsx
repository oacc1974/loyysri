import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

// Configuración de la fuente Inter de Google
const inter = Inter({ subsets: ['latin'] });

// Metadatos de la aplicación
export const metadata: Metadata = {
  title: 'Loyverse SRI Ecuador',
  description: 'Sistema de integración para facturación electrónica SRI Ecuador con Loyverse POS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {/* Cabecera */}
          <header className="bg-white shadow-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Loyverse SRI Ecuador</h1>
                </div>
                <div>
                  <span className="text-sm text-gray-600">v1.0.0</span>
                </div>
              </div>
            </div>
          </header>

          {/* Contenido principal */}
          <main className="flex-grow">
            {children}
          </main>

          {/* Pie de página */}
          <footer className="bg-gray-100 border-t">
            <div className="container mx-auto px-4 py-4">
              <div className="text-center text-sm text-gray-600">
                &copy; {new Date().getFullYear()} Loyverse SRI Ecuador - Todos los derechos reservados
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
