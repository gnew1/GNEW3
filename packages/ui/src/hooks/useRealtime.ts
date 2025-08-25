import { useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeClient } from '@gnew/sdk-client/realtime';

type Room = 'governance' | 'economy';
type PresenceEvent = { type: 'presence'; members?: { id: string }[] };
type DataEvent = { type: string; ts?: number; data?: unknown; [k: string]: unknown };
type Event = PresenceEvent | DataEvent;
type UIEvent = DataEvent & { _id: string; ts: number };
type UseRealtimeOpts = Readonly<{ url?: string; token: string; room: Room; preferSSE?: boolean }>;

export function useRealtime({ url = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:8010', token, room, preferSSE }: UseRealtimeOpts) {
  const client = useMemo(() => new RealtimeClient(url, token), [url, token]);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<string[]>([]);
  const eventsRef = useRef<UIEvent[]>([]);
  const [events, setEvents] = useState<UIEvent[]>([]);
  const seqRef = useRef(0);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    const onEvent = (evt: Event) => {
      if (evt.type === 'presence') {
        const members = (evt as PresenceEvent).members ?? [];
        const ids = (members as { id: string }[]).map((m: { id: string }) => m.id);
        setPresence(ids);
        return;
      }
      const ts = (evt as DataEvent).ts ?? Date.now();
      const uiEvt: UIEvent = { ...(evt as DataEvent), ts, _id: `${ts}-${seqRef.current++}` };
      const next = [uiEvt, ...eventsRef.current].slice(0, 200);
      eventsRef.current = next;
      setEvents(next);
    };
    client.connect(!!preferSSE).then(async () => {
      setConnected(true);
      unsub = await client.subscribe(room, onEvent);
    });
    return () => { unsub?.(); setConnected(false); };
  }, [room, client, preferSSE]);

  return { connected, events, presence };
}


