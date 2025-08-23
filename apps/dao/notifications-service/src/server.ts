
import express from "express";
import notifyRouter from "./api/notify";
import "./websocket/server";

const app = express();
app.use(express.json());

app.use("/notify", notifyRouter);

const port = process.env.API_PORT || 4003;
app.listen(port, () => {
  console.log(`Notifications API running on port ${port}`);
});

Prompt N262 — Microservicio de notificaciones en tiempo real

Stack: Node.js + Express + TypeScript + WebSocket.

Implementa un servidor WebSocket para difundir notificaciones de propuestas y votos.

Expone un endpoint REST POST /notify que recibe un mensaje con { type, payload } y lo transmite a todos los clientes conectados.

Se ejecuta en el monorepo bajo apps/dao/notifications-service.

👉 Listo para integrarse con el servicio de gobernanza y la UI de GNEW.

