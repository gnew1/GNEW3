
import { WebSocketServer, WebSocket } from "ws";
import http from "http";

type NotificationMessage = {
  type: "proposal_update" | "vote_cast" | "system_alert";
  payload: any;
};

const server = http.createServer();
const wss = new WebSocketServer({ server });

const clients = new Set<WebSocket>();

wss.on("connection", (ws: WebSocket) => {
  clients.add(ws);
  console.log("Client connected. Active clients:", clients.size);

  ws.on("message", (message) => {
    try {
      const parsed: NotificationMessage = JSON.parse(message.toString());
      console.log("Message from client:", parsed);
    } catch (err) {
      console.error("Invalid message", err);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log("Client disconnected. Active clients:", clients.size);
  });
});

export function broadcastNotification(notification: NotificationMessage) {
  const data = JSON.stringify(notification);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

const port = process.env.PORT || 4002;
server.listen(port, () => {
  console.log(`Notifications WebSocket service running on port ${port}`);
});


