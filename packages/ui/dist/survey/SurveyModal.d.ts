import React from "react";
import type { Survey } from "./types";
type Props = {
    survey: Survey;
    userId: string;
    event: string;
    onClose: () => void;
    endpoint?: string;
};
export declare const SurveyModal: React.FC<Props>;
export {};
