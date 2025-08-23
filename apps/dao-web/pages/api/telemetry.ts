
import type { NextApiRequest, NextApiResponse } from "next";
import { TelemetryCollector } from "../../../services/telemetry/collector";

const collector = new TelemetryCollector("dao-web");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { service, event, data } = req.body;
    collector.log(event, data);
    res.status(200).json({ status: "ok" });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}


