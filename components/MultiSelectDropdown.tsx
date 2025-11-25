
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { FOCUSES } from '../constants';
import { Focus } from '../types';

interface Option {
  id: string;
  name: string;
  description?: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  label: string;
  icon: 'sparkles';
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ options, selectedIds, onSelectionChange, label, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleToggleOption = (optionId: string) => {
    const newSelectedIds = selectedIds.includes(optionId)
      ? selectedIds.filter(id => id !== optionId)
      : [...selectedIds, optionId];
    onSelectionChange(newSelectedIds);
  };

  const focusDetails = FOCUSES.reduce((acc, focus) => {
    acc[focus.id] = focus.description;
    return acc;
  }, {} as Record<Focus, string>);


  return (
    <div className="relative" ref={wrapperRef}>
        <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 ${
            isOpen || selectedIds.length > 0
                ? 'bg-slate-600 text-white'
                : 'bg-[var(--bg-tertiary)] hover:bg-opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Select context focuses"
        >
            <Icon name={icon} className="w-4 h-4" />
            {label}
            {selectedIds.length > 0 && (
            <span className="bg-[var(--accent-primary)] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {selectedIds.length}
            </span>
            )}
        </button>

        {isOpen && (
            <div className="absolute top-full mt-2 right-0 w-80 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl z-30 animate-fade-in-down">
                <div className="p-3">
                    <h4 className="text-sm font-semibold text-white mb-2">Select Focuses</h4>
                    <p className="text-xs text-[var(--text-secondary)]">Specialize the AI's expertise for your current task.</p>
                </div>
                <div className="border-t border-[var(--border-primary)] max-h-72 overflow-y-auto p-2">
                    {options.map(option => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => handleToggleOption(option.id)}
                            className={`w-full text-left p-2.5 rounded-md text-sm transition-colors flex items-center gap-3 ${
                                selectedIds.includes(option.id)
                                ? 'bg-[var(--accent-primary)]/20 text-white'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                            }`}
                             title={focusDetails[option.id as Focus]}
                        >
                            <div className={`w-4 h-4 rounded-sm flex-shrink-0 border-2 flex items-center justify-center ${selectedIds.includes(option.id) ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-secondary)]'}`}>
                                {selectedIds.includes(option.id) && <Icon name="check" className="w-3 h-3 text-white" />}
                            </div>
                            <span>{option.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};