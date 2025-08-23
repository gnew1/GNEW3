
interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  details: any;
  timestamp: string;
}

const entries: AuditEntry[] = [];

export async function saveAuditEntry(
  action: string,
  userId: string,
  details: any
): Promise<AuditEntry> {
  const entry: AuditEntry = {
    id: (entries.length + 1).toString(),
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  };

  entries.push(entry);
  console.log("Audit entry saved:", entry);
  return entry;
}

export async function getAuditEntries(userId: string): Promise<AuditEntry[]> {
  return entries.filter((e) => e.userId === userId);
}


