import React, { useState, useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

export interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface GuidedTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  steps,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (!currentStepData) return;

    const targetElement = document.querySelector(
      `[data-tour="${currentStepData.target}"]`
    ) as HTMLElement;

    if (!targetElement) {
      console.warn(`Tour target not found: ${currentStepData.target}`);
      return;
    }

    // Scroll target into view
    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

    // Calculate position for highlight overlay and tooltip
    const rect = targetElement.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Highlight overlay (cutout effect)
    setOverlayStyle({
      position: "absolute",
      top: rect.top + scrollY - 8,
      left: rect.left + scrollX - 8,
      width: rect.width + 16,
      height: rect.height + 16,
      pointerEvents: "none",
    });

    // Tooltip positioning
    const position = currentStepData.position || "bottom";
    let top = 0;
    let left = 0;

    switch (position) {
      case "bottom":
        top = rect.bottom + scrollY + 16;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case "top":
        top = rect.top + scrollY - 16;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case "right":
        top = rect.top + scrollY + rect.height / 2;
        left = rect.right + scrollX + 16;
        break;
      case "left":
        top = rect.top + scrollY + rect.height / 2;
        left = rect.left + scrollX - 16;
        break;
    }

    setTooltipStyle({
      position: "absolute",
      top,
      left,
      transform:
        position === "bottom" || position === "top"
          ? "translateX(-50%)"
          : "translateY(-50%)",
      zIndex: 10001,
    });
  }, [currentStep, currentStepData]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!currentStepData) return null;

  return (
    <>
      {/* Dark overlay with cutout effect */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      />

      {/* Highlight box around target */}
      <div
        style={{
          ...overlayStyle,
          zIndex: 10000,
          border: "3px solid #3b82f6",
          borderRadius: "8px",
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
        }}
      />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="bg-white rounded-lg shadow-2xl p-5 max-w-md border-2 border-blue-500"
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">
            {currentStepData.title}
          </h3>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 ml-2"
            aria-label="Close tour"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          {currentStepData.description}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </span>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {currentStep < steps.length - 1 ? "Next" : "Finish"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuidedTour;
