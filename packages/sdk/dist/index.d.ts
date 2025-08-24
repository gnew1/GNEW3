export type GnewOptions = {
    baseUrl: string;
};
export declare class Gnew {
    private readonly opts;
    constructor(opts: GnewOptions);
    health(): Promise<{
        status: "ok";
    }>;
    echo(msg: string): Promise<{
        echo: string;
    }>;
}
export default Gnew;
export { AntiCollusionClient } from "./clients/antiCollusion.js";
export { ReviewsClient, type ReviewPayload } from "./clients/reviews.js";
