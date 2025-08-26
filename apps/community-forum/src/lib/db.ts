export type Post = { author: string; content: string };
export interface Thread {
  id: string;
  title: string;
  author: string;
  posts: Post[];
}

const threads: Thread[] = [
  { id: "1", title: "Welcome to GNEW", author: "System", posts: [{ author: "System", content: "Introduce yourself!" }] }
];

export async function getThreads(): Promise<Thread[]> {
  return threads;
}

export async function getThreadById(id: string): Promise<Thread | undefined> {
  return threads.find(t => t.id === id);
}

export async function addThread(title: string, author: string, content: string): Promise<Thread> {
  const id = String(Date.now());
  const thread: Thread = { id, title, author, posts: [{ author, content }] };
  threads.push(thread);
  return thread;
}
