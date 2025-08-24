type UseRealtimeOpts = {
    url?: string;
    token: string;
    room: 'governance' | 'economy';
    preferSSE?: boolean;
};
export declare function useRealtime({ url, token, room, preferSSE }: UseRealtimeOpts): {
    connected: boolean;
    events: any[];
    presence: string[];
};
export {};
