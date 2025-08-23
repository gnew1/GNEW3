export type LabelItem = {
    kind: "group" | "user";
    key: string | number;
    y: 0 | 1;
};
export declare class AntiCollusionClient {
    private baseUrl;
    private token?;
    constructor(baseUrl: string, token?: string | undefined);
    private h;
    ingestVotes(rows: {
        address: string;
        target: string;
        ts: string;
        value?: number;
        meta?: any;
    }[]): Promise<any>;
    label(items: LabelItem[]): Promise<any>;
    run(): Promise<any>;
    groups(batch_id: string): Promise<any>;
    dodStatus(): Promise<any>;
}
