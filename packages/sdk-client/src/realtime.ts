/* eslint-disable @typescript-eslint/no-explicit-any */ 
export type EventHandler = (evt: any) => void; 
 
export class RealtimeClient { 
  private ws?: WebSocket; 
  private sse?: EventSource; 
  private readonly token: string; 
  private readonly url: string; 
  private readonly handlers: Map<string, Set<EventHandler>> = new Map(); 
  private readonly joined: Set<string> = new Set(); 
  private backoff = 500; 
  private readonly maxBackoff = 6000; 
 
  constructor(url: string, token: string) { 
    this.url = url.replace(/\/$/, ''); 
    this.token = token; 
  } 
 
  async connect(preferSSE = false) { 
    if (!preferSSE) return this.connectWS().catch(() => this.connectSSE()); 
    return this.connectSSE().catch(() => this.connectWS()); 
  } 
 
  private connectWS(): Promise<void> { 
    return new Promise((resolve, reject) => { 
      const w = new WebSocket(`${this.url.replace(/^http/, 'ws')}/`, ['json']); 
      // auth via query token if not supported by infra; here we use header-less, so append
      (w as any).url = `${this.url.replace(/^http/, 'ws')}/?token=${encodeURIComponent(this.token)}`; 
      this.ws = new WebSocket((w as any).url); 
      this.ws.onopen = () => { 
        this.backoff = 500; 
        // rejoin rooms
        this.joined.forEach(r => this.ws?.send(JSON.stringify({ type: 'join', room: r }))); 
        resolve(); 
      }; 
      this.ws.onmessage = (m) => this.dispatch(m.data); 
      this.ws.onclose = () => this.reconnect('ws'); 
      this.ws.onerror = () => reject(new Error('ws-failed')); 
    }); 
  } 
 
  private connectSSE(): Promise<void> { 
    return new Promise((resolve, reject) => { 
      // pick first room later; on subscribe we open per-room SSE 
      if (this.joined.size === 0) return reject(new Error('no-room')); 
      const room = Array.from(this.joined)[0]; 
      const sseUrl = `${this.url}/sse/${encodeURIComponent(room)}`; 
      this.sse = new EventSource(sseUrl, { withCredentials: false }); 
      this.sse.onopen = () => { this.backoff = 500; resolve(); }; 
      this.sse.onerror = () => this.reconnect('sse'); 
  this.sse.addEventListener('event', (e: MessageEvent) => this.dispatch(e.data)); 
  this.sse.addEventListener('presence', (e: MessageEvent) => this.dispatch(e.data)); 
    }); 
  } 
 
  private reconnect(kind: 'ws'|'sse') { 
    setTimeout(() => { 
      this.backoff = Math.min(this.backoff * 2, this.maxBackoff); 
  if (kind === 'ws') this.connectWS().catch(() => this.connectSSE()); 
      else this.connectSSE().catch(() => this.connectWS()); 
    }, this.backoff); 
  } 
 
  private dispatch(data: any) { 
    try { 
      const evt = JSON.parse(String(data)); 
      const room = evt.room || (evt.data?.room ?? 'global'); 
      for (const [key, hs] of this.handlers.entries()) { 
        if (key === room || key === '*') hs.forEach(h => h(evt)); 
      } 
    } catch (e) { 
      // swallow invalid json but keep a breadcrumb for debug
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('realtime dispatch parse error', e);
      }
    } 
  } 
 
  async subscribe(room: string, handler: EventHandler) { 
    if (!this.joined.has(room)) { 
      this.joined.add(room); 
      if (this.ws?.readyState === WebSocket.OPEN) { 
        this.ws.send(JSON.stringify({ type: 'join', room })); 
      } 
    } 
    const set = this.handlers.get(room) || new Set<EventHandler>(); 
    set.add(handler); 
    this.handlers.set(room, set); 
    return () => { 
      set.delete(handler); 
      if (set.size === 0) { 
        this.handlers.delete(room); 
        this.joined.delete(room); 
  if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'leave', room })); 
      } 
    }; 
  } 
} 
 
 
