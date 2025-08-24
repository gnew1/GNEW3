import type { Survey } from "./types";
export declare function useSurveyTrigger(event: string, userId: string, endpoint?: string): {
    survey: Survey | null;
    open: boolean;
    setOpen: import("react").Dispatch<import("react").SetStateAction<boolean>>;
};
