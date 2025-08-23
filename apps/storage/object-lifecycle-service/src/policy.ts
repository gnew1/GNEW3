
import { db } from "./db.js";

export type Policy = {
  id: string;
  bucket: string;
  prefix: string | null;
  minRetentionDays: number;
  mode: "governance" | "compliance";
  preventOverwrite: number;
};

export function findPolicy(bucket: string, key: string): Policy | null {
  // match más específico


