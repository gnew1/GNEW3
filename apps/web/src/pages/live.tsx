import React from 'react'; 
import { LiveEvents } from '@gnew/ui/LiveEvents'; 
// If a ThemeProvider exists later, update this import accordingly; using a passthrough for now
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
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
 
 
