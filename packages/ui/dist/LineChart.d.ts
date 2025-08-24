import React from 'react';
type Series = {
    id: string;
    data: {
        x: string | number | Date;
        y: number;
    }[];
};
export declare function LineChart({ data, xKey, yKey, height, ...rest }: {
    data: Series[];
    xKey: string;
    yKey: string;
    height?: number;
} & React.SVGProps<SVGSVGElement>): import("react/jsx-runtime").JSX.Element;
export {};
