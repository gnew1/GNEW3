import { useEffect, useMemo, useRef, useState } from 'react'; 
import { RealtimeClient } from '@gnew/sdk-client/realtime'; 
 
type UseRealtimeOpts = { url?: string; token: string; room: 
'governance' | 'economy'; preferSSE?: boolean }; 
 
export function useRealtime({ url = 
process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:8010', 
token, room, preferSSE }: UseRealtimeOpts) { 
  const client = useMemo(() => new RealtimeClient(url, token), [url, 
token]); 
  const [connected, setConnected] = useState(false); 
  const [presence, setPresence] = useState<string[]>([]); 
  const eventsRef = useRef<any[]>([]); 
  const [events, setEvents] = useState<any[]>([]); 
 
  useEffect(() => { 
    let unsub: (() => void) | undefined; 
    client.connect(!!preferSSE).then(async () => { 
      setConnected(true); 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unsub = await client.subscribe(room, (evt: any) => { 
        if (evt.type === 'presence') { 
          setPresence((evt.members || []).map((m: any) => m.id)); 
        } else { 
          eventsRef.current = [evt, ...eventsRef.current].slice(0, 
200); 
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
 
 
