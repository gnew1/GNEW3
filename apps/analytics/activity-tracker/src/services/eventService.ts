
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

const eventsFile = path.resolve(__dirname, "../../data/events.json");

type EventData = {
  id: string;
  userId: string;
  event: string;
  metadata?: object;
  timestamp: string;
};

export async function saveEvent({
  userId,
  event,
  metadata,
}: {
  userId: string;
  event: string;
  metadata?: object;
}): Promise<EventData> {
  const newEvent: EventData = {
    id: uuidv4(),
    userId,
    event,
    metadata,
    timestamp: new Date().toISOString(),
  };

  let events: EventData[] = [];
  if (fs.existsSync(eventsFile)) {
    const raw = fs.readFileSync(eventsFile, "utf-8");
    try {
      events = JSON.parse(raw);
    } catch {
      events = [];
    }
  }

  events.push(newEvent);
  fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));

  return newEvent;
}


