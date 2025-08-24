export type EventHandler = (evt: any) => void;
export declare class RealtimeClient {
    private ws?;
    private sse?;
    private readonly token;
    private readonly url;
    private readonly handlers;
    private readonly joined;
    private backoff;
    private readonly maxBackoff;
    constructor(url: string, token: string);
    connect(preferSSE?: boolean): Promise<void>;
    private connectWS;
    private connectSSE;
    private reconnect;
    private dispatch;
    subscribe(room: string, handler: EventHandler): Promise<() => void>;
}
