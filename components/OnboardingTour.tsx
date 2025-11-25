import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Icon } from './Icon';
import { AIAssistantModal } from './AIAssistantModal';

interface OnboardingTourProps {
  onComplete: () => void;
}

interface TourStep {
  selector?: string;
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    placement: 'center',
    title: 'Welcome to The Muse Engine!',
    content: "This quick tour will show you the core features. You can use the ✨ button on any step to ask our AI for more details about a feature."
  },
  {
    selector: '[data-tour-id="projects-and-tabs"]',
    placement: 'bottom',
    title: 'Organize Your Work',
    content: 'Use Projects to group different topics. Inside each project, create multiple Sessions (Tabs) to keep conversations separate and focused.'
  },
  {
    selector: '[data-tour-id="input-controller"]',
    placement: 'top',
    title: 'Your Creative Command Center',
    content: "This is where you'll type your prompts, questions, and ideas. Use the microphone for voice-to-text, and hit the send button to get a response."
  },
  {
    selector: '[data-tour-id="modes"]',
    placement: 'top',
    title: "Choose Your AI's Personality",
    content: "Modes change how the AI behaves. 'Muse' is for creative/technical tasks, 'Chat' is for conversational Q&A, and 'Live' is for voice conversations."
  },
  {
    selector: '[data-tour-id="focuses"]',
    placement: 'top',
    title: 'Specialize Your AI',
    content: "Add 'Focuses' like 'Code' or 'Creative' to give the AI specific expertise for your task. This is especially powerful in Muse mode."
  },
  {
    placement: 'center',
    title: "You're All Set!",
    content: "That's the basics! Now it's your turn to explore and create something amazing with The Muse Engine."
  }
];

const getTopicFromStep = (stepIndex: number): string => {
    switch (stepIndex) {
        case 1: return "Projects and Tabs";
        case 2: return "The Input Controller";
        case 3: return "AI Modes";
        case 4: return "AI Focuses";
        default: return "The Muse Engine";
    }
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = TOUR_STEPS[stepIndex];
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  useLayoutEffect(() => {
    if (currentStep.selector) {
      const element = document.querySelector<HTMLElement>(currentStep.selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        const timeoutId = setTimeout(() => {
             // Ensure the element is still attached to the DOM before getting its dimensions
             if (element.isConnected) {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);
             }
        }, 300);

        return () => clearTimeout(timeoutId);
      } else {
        console.warn(`Onboarding tour selector not found: ${currentStep.selector}`);
        setTargetRect(null); // Hide highlight if element not found
      }
    } else {
      setTargetRect(null); // For centered steps
    }
  }, [stepIndex, currentStep.selector]);

  const handleNext = () => {
    if (!isLastStep) {
      setStepIndex(i => i + 1);
    } else {
      onComplete();
    }
  };
  
  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(i => i - 1);
    }
  };
  
  const highlightStyle: React.CSSProperties = targetRect ? {
    position: 'fixed',
    top: targetRect.top - 8,
    left: targetRect.left - 8,
    width: targetRect.width + 16,
    height: targetRect.height + 16,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
    border: '2px solid var(--accent-primary)',
    borderRadius: 'var(--radius-lg)',
    zIndex: 51,
    transition: 'all 0.3s ease-in-out',
    pointerEvents: 'none',
  } : {};
  
  const getTooltipPosition = (): React.CSSProperties => {
      const centeredStyle: React.CSSProperties = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };

      if (!targetRect || !tooltipRef.current) {
        return centeredStyle;
      }
      
      const tooltipHeight = tooltipRef.current.offsetHeight;
      const tooltipWidth = tooltipRef.current.offsetWidth;
      const spacing = 16;
      
      let top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      
      switch (currentStep.placement) {
          case 'top':
              top = targetRect.top - tooltipHeight - spacing;
              break;
          case 'bottom':
              top = targetRect.bottom + spacing;
              break;
          case 'left':
              left = targetRect.left - tooltipWidth - spacing;
              break;
          case 'right':
              left = targetRect.right + spacing;
              break;
          default: // center
              top = vh / 2 - tooltipHeight / 2;
              left = vw / 2 - tooltipWidth / 2;
              break;
      }

      // Keep tooltip within viewport
      if (left < spacing) left = spacing;
      if (top < spacing) top = spacing;
      if (left + tooltipWidth > vw - spacing) left = vw - tooltipWidth - spacing;
      if (top + tooltipHeight > vh - spacing) top = vh - tooltipHeight - spacing;


      return { top, left };
  }

  return (
    <>
      <div className="fixed inset-0 z-50 transition-opacity duration-300" style={{ backgroundColor: targetRect ? 'transparent' : 'rgba(0,0,0,0.6)' }}>
        {targetRect && <div style={highlightStyle} />}
        
        <div 
          ref={tooltipRef}
          style={{...getTooltipPosition(), zIndex: 52}}
          className="fixed bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl w-full max-w-sm p-5 animate-fade-in transition-all duration-300 ease-in-out"
        >
          <div className="flex justify-between items-start gap-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{currentStep.title}</h3>
            <button
                onClick={() => setIsAssistantOpen(true)}
                className="flex-shrink-0 p-1.5 rounded-full text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20"
                title="Ask AI for more details"
            >
                <Icon name="sparkles" className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-5">{currentStep.content}</p>

          <div className="flex justify-between items-center">
            <button onClick={onComplete} className="text-xs text-[var(--text-secondary)] hover:text-white font-semibold">Skip Tour</button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && <button onClick={handlePrev} className="px-4 py-2 text-sm rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-white font-semibold">Previous</button>}
              <button onClick={handleNext} className="px-4 py-2 text-sm rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold">{isLastStep ? 'Finish' : 'Next'}</button>
            </div>
          </div>
        </div>
      </div>
      <AIAssistantModal 
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        topic={getTopicFromStep(stepIndex)}
      />
    </>
  );
};