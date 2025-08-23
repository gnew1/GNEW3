import React from 'react'; 
import { LiveEvents } from '@repo/ui/LiveEvents'; 
import { ThemeProvider } from '@repo/ui/theme'; 
import { useSession } from 'next-auth/react'; 
 
export default function LivePage() { 
  const { data } = useSession(); 
  const token = (data as any)?.accessToken; 
  if (!token) return <div>Inicia sesión…</div>; 
  return ( 
    <ThemeProvider> 
      <div style={{ padding: 24 }}> 
        <h1>Eventos en vivo</h1> 
        <LiveEvents token={token} /> 
      </div> 
    </ThemeProvider> 
  ); 
} 
 
 
