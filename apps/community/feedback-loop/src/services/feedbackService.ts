
interface FeedbackEntry {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
}

const entries: FeedbackEntry[] = [];

export async function submitFeedback(
  userId: string,
  content: string
): Promise<FeedbackEntry> {
  const entry: FeedbackEntry = {
    id: (entries.length + 1).toString(),
    userId,
    content,
    timestamp: new Date().toISOString(),
  };

  entries.push(entry);
  console.log("Feedback submitted:", entry);
  return entry;
}

export async function listFeedback(): Promise<FeedbackEntry[]> {
  return entries;
}


