
/**
 * GNEW · N350 — Audit Logger
 * Objetivo: Registrar en un log seguro todas las acciones críticas de la DAO
 */

import fs from "fs";
import path from "path";

const logPath = path.resolve(__dirname, "../../logs/audit.log");

export interface AuditEntry {
  userId: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogger {
  static log(entry: AuditEntry): void {
    const record = JSON.stringify(entry) + "\n";
    fs.appendFileSync(logPath, record, { encoding: "utf-8" });
  }

  static readAll(): AuditEntry[] {
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}


