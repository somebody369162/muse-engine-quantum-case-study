
import React, { useState } from 'react';
import { Icon } from './Icon';

interface UserInputPromptProps {
    promptText: string;
    onSubmit: (inputText: string) => void;
    isExecuting: boolean;
}

export const UserInputPrompt: React.FC<UserInputPromptProps> = ({ promptText, onSubmit, isExecuting }) => {
    const [userInput, setUserInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userInput.trim() && !isExecuting) {
            onSubmit(userInput);
        }
    };

    return (
        <div className="mt-3 p-3 bg-indigo-900/40 rounded-md border border-indigo-700 text-sm">
            <p className="font-semibold text-indigo-200 mb-2">{promptText}</p>
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Your response..."
                    className="flex-1 bg-indigo-950/70 border border-indigo-700 rounded-md p-2 text-sm text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                    disabled={isExecuting}
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={isExecuting || !userInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-3 rounded-md text-sm transition-colors flex items-center gap-1.5 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    <Icon name="send" className="w-4 h-4" />
                    Submit
                </button>
            </form>
        </div>
    );
};
