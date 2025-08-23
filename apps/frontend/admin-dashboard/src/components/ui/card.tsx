
import { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 ${className || ""}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

Prompt N396 — Notifications Page (Admin Dashboard)

Stack: React + Tailwind + Framer Motion + shadcn/ui + lucide-react.

Crear una página de notificaciones en el dashboard de administración.

Cada notificación tiene tipo (info, success, error), mensaje y timestamp.

Mostrar iconos con color según el tipo, animaciones al aparecer, y listado cronológico.

Base para integrar con un backend de alertas en tiempo real.