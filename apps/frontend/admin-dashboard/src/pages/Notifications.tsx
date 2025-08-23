
import { useEffect, useState } from "react";
import { Bell, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface Notification {
  id: string;
  type: "info" | "success" | "error";
  message: string;
  timestamp: number;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Simulación: fetch de notificaciones desde backend
    const initial: Notification[] = [
      { id: "1", type: "info", message: "Nueva actualización de GNEW DAO", timestamp: Date.now() },
      { id: "2", type: "success", message: "Tu propuesta fue aceptada por la guild", timestamp: Date.now() - 10000 },
      { id: "3", type: "error", message: "Fallo al procesar transacción en testnet", timestamp: Date.now() - 20000 },
    ];
    setNotifications(initial);
  }, []);

  const renderIcon = (type: Notification["type"]) => {
    switch (type) {
      case "info":
        return <Bell className="text-blue-500" />;
      case "success":
        return <CheckCircle className="text-green-500" />;
      case "error":
        return <AlertCircle className="text-red-500" />;
    }
  };

  return (
    <div className="grid gap-4 p-6">
      <h1 className="text-2xl font-bold">Notificaciones</h1>
      {notifications.map((n) => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="shadow-md rounded-2xl">
            <CardContent className="flex items-center gap-4 p-4">
              {renderIcon(n.type)}
              <div>
                <p className="text-base">{n.message}</p>
                <span className="text-sm text-gray-500">
                  {new Date(n.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}


