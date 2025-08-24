export type Question = {
    id: string;
    type: "nps";
    label: string;
    scale?: number;
} | {
    id: string;
    type: "csat";
    label: string;
    scale?: number;
} | {
    id: string;
    type: "text";
    label: string;
};
export interface Survey {
    id: number;
    name: string;
    trigger: string;
    locale: string;
    frequency_days: number;
    questions: Question[];
}
