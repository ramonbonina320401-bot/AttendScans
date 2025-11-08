import React, { useState } from "react";
import { FiHelpCircle } from "react-icons/fi";

interface HelpTooltipProps {
  term: string;
  definition: string;
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  term,
  definition,
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="ml-1 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
        aria-label={`Help for ${term}`}
      >
        <FiHelpCircle className="w-4 h-4" />
      </button>

      {isVisible && (
        <div className="absolute left-6 top-0 z-50 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="text-xs font-semibold text-blue-600 mb-1">
            {term}
          </div>
          <div className="text-xs text-gray-700 leading-relaxed">
            {definition}
          </div>
          {/* Arrow pointer */}
          <div className="absolute left-0 top-2 -translate-x-1 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-[-45deg]" />
        </div>
      )}
    </span>
  );
};

export default HelpTooltip;
