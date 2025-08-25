import React from 'react'; 
import { useRealtime } from './hooks/useRealtime'; 
import { Button } from './button'; 
import { Card } from './card'; 
 
export function LiveEvents({ token }: Readonly<{ token: string }>) { 
  const [room, setRoom] = React.useState<'governance' | 
'economy'>('governance'); 
  const { connected, presence, events } = useRealtime({ token, room 
}); 
 
  return ( 
    <div style={{ display: 'grid', gap: 12 }}> 
      <div style={{ display: 'flex', gap: 8 }}> 
        <Button onClick={() => setRoom('governance')} 
aria-pressed={room === 'governance'}>Gobernanza</Button> 
        <Button onClick={() => setRoom('economy')} aria-pressed={room 
=== 'economy'}>Economía</Button> 
        <span style={{ marginLeft: 'auto' }}>Estado: {connected ? 
'Conectado' : 'Offline'} • Presentes: {presence.length}</span> 
      </div> 
      <Card title={`Eventos en ${room}`}> 
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, 
display: 'grid', gap: 6 }}> 
          {events.map((e) => ( 
            <li key={JSON.stringify(e)} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}> 
              <strong>{new Date(e.ts).toLocaleTimeString()}:</strong> 
<code>{JSON.stringify(e.data)}</code> 
            </li> 
          ))} 
          {events.length === 0 && <li>No hay eventos aún…</li>} 
        </ul> 
      </Card> 
    </div> 
  ); 
} 
 
 
