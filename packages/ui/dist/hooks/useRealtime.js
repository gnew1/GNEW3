import { useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeClient } from '@gnew/sdk-client/realtime';
export function useRealtime({ url = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:8010', token, room, preferSSE }) {
    const client = useMemo(() => new RealtimeClient(url, token), [url,
        token]);
    const [connected, setConnected] = useState(false);
    const [presence, setPresence] = useState([]);
    const eventsRef = useRef([]);
    const [events, setEvents] = useState([]);
    useEffect(() => {
        let unsub;
        client.connect(!!preferSSE).then(async () => {
            setConnected(true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            unsub = await client.subscribe(room, (evt) => {
                if (evt.type === 'presence') {
                    setPresence((evt.members || []).map((m) => m.id));
                }
                else {
                    eventsRef.current = [evt, ...eventsRef.current].slice(0, 200);
                    setEvents([...eventsRef.current]);
                }
            });
        });
        return () => {
            unsub?.();
            setConnected(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps 
    }, [room, client]);
    return { connected, events, presence };
}
