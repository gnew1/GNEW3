import { Rule } from "./types";
export type Collision = {
    a: Rule;
    b: Rule;
    reason: string;
};
export declare function detectCollisions(rules: Rule[]): Collision[];
