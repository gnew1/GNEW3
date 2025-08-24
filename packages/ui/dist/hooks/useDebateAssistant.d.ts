export type PanelData = {
    thread_id: number;
    title: string;
    tldr: string;
    key_arguments: string[];
    tags: string[];
    agenda: string[];
    sources: string[];
};
export declare function useDebatePanel(apiBase: string, threadId: number): {
    data: PanelData | null;
    loading: boolean;
    err: string | null;
};
export type Role = "guest" | "member" | "mod" | "admin";
export type Rule = {
    id: string;
    name: string;
};
export type Topic = {
    key: string;
    "gobernanza/presupuesto": any;
    title: string;
    description?: string;
    matrix_room?: string;
    forums_tag?: string;
    roles: Partial<Record<Role, boolean>>;
    rules: string[];
};
export type Area = {
    id: string;
    guild: string;
    name: string;
    topics: Topic[];
    space_alias?: string;
    created_at: string;
    updated_at: string;
};
export type NoiseSample = {
    topic_key: string;
    ts: string;
    source: "matrix" | "forums";
    signal: "on_topic" | "off_topic";
    moderación: any;
    reason?: string;
    "denylist": any;
};
export declare function makePool(url?: string): any;
export declare const SQL: {
    schema: string;
};
import { Rule, Area, Topic } from "./types";
/** Detector simple de off-topic basado en listas y heurísticos */
export declare function buildOffTopicChecker(): (content: string, rules: Rule[]) => {
    ok: boolean;
    reason: string;
} | {
    ok: boolean;
    reason?: undefined;
};
/** Sincroniza con el Provisioner Matrix existente (servicio
matrix-provisioner). */
export declare function provisionMatrixSpaceAndRooms(area: Area, topics: Topic[]): Promise<{
    space_alias: any;
    topics: {
        key: any;
        matrix_room: string;
    }[];
}>;
