import React from "react";
export interface TourStep {
    target: string;
    title: string;
    description: string;
    position?: "top" | "bottom" | "left" | "right";
}
interface GuidedTourProps {
    steps: TourStep[];
    onComplete: () => void;
    onSkip: () => void;
}
export declare const GuidedTour: React.FC<GuidedTourProps>;
export default GuidedTour;
