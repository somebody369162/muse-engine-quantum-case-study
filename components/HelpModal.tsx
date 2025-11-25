import React, { useState } from 'react';
import { Icon } from './Icon';
import { MODES, FOCUSES } from '../constants';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DocSection = 'welcome' | 'features' | 'modes' | 'focuses' | 'profiles' | 'faq';

const Sidebar: React.FC<{ activeSection: DocSection; onSelect: (section: DocSection) => void }> = ({ activeSection, onSelect }) => {
  const sections: { id: DocSection; label: string }[] = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'features', label: 'Core Features' },
    { id: 'modes', label: 'AI Modes' },
    { id: 'focuses', label: 'AI Focuses' },
    { id: 'profiles', label: 'Session Profiles' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <nav className="w-48 border-r border-[var(--border-primary)] p-2 flex-shrink-0">
      <ul className="space-y-1">
        {sections.map(section => (
          <li key={section.id}>
            <button
              onClick={() => onSelect(section.id)}
              className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeSection === section.id
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const Content: React.FC<{ activeSection: DocSection }> = ({ activeSection }) => {
  return (
    <main className="flex-1 overflow-y-auto p-6 prose-custom">
      {activeSection === 'welcome' && (
        <>
          <h2>Welcome to The Muse Engine</h2>
          <p>The Muse Engine is a real-time, collaborative tool designed for creative and technical exploration, powered by the Google Gemini API. It's your canvas to explore concepts, get help with writing, brainstorm ideas, and solve complex problems with an advanced AI partner.</p>
          <p>This documentation will guide you through the core features to help you get started. Use the sidebar to navigate to different topics.</p>
        </>
      )}
      {activeSection === 'features' && (
        <>
          <h2>Core Features</h2>
          <h3>Projects & Sessions</h3>
          <p>Your work is organized into <strong>Projects</strong>. Each project can contain multiple <strong>Sessions</strong> (represented as tabs). This structure allows you to keep different topics or workflows neatly separated.</p>
          <ul>
            <li><strong>Projects:</strong> Use the dropdown in the top-left to create, rename, delete, or switch between projects.</li>
            <li><strong>Sessions (Tabs):</strong> Within a project, you can have multiple tabs. Each tab maintains its own conversation history, selected mode, and focuses.</li>
          </ul>

          <h3>The Input Controller</h3>
          <p>The area at the bottom of the screen is your primary interface for interacting with the AI. Here you can:</p>
          <ul>
            <li><strong>Type Prompts:</strong> Enter any question, idea, or command.</li>
            <li><strong>Transcribe Audio:</strong> Use the microphone button to speak your prompt.</li>
            <li><strong>Attach Files:</strong> Attach images and text files for the AI to analyze.</li>
            <li><strong>Predictive Text:</strong> Enable AI-powered suggestions as you type.</li>
            <li><strong>Use Saved Prompts:</strong> Quickly access frequently used prompts.</li>
          </ul>
          
          <h3>Document Editor</h3>
          <p>The Document Editor is a powerful writing space. Access it via the "Document" button in the input bar. Features include:</p>
          <ul>
              <li><strong>AI Writing Tools:</strong> Select text to improve, fix grammar, shorten, or expand content using the "Magic" wand menu. You can also ask the AI to continue writing from your cursor.</li>
              <li><strong>Templates:</strong> Start new documents from a blank page or a pre-built template like "Meeting Minutes" or "Project Proposal". You can create your own templates in Settings.</li>
              <li><strong>Formatting Toolbar:</strong> Easily format your text with Markdown styles like bold, italic, headers, and lists.</li>
              <li><strong>Live Stats:</strong> Track your word and character count in real-time.</li>
              <li><strong>Export:</strong> Download your document as a Markdown file.</li>
          </ul>
          
          <h3>Web Search</h3>
          <p>Toggling <strong>Web Search</strong> allows the AI to access up-to-date information from Google Search. This is essential for questions about recent events or topics where current data is important. This feature is automatically enabled for modes like Chat and Professor.</p>
        </>
      )}
       {activeSection === 'modes' && (
        <>
          <h2>AI Modes Explained</h2>
          <p>Modes change the AI's fundamental behavior and personality. Choosing the right mode is key to getting the best results for your task.</p>
          {MODES.map(mode => (
            <div key={mode.id} className="mt-4">
              <h4>{mode.name}</h4>
              <p>{mode.description}</p>
            </div>
          ))}
        </>
      )}
      {activeSection === 'focuses' && (
        <>
          <h2>AI Focuses Explained</h2>
          <p>Focuses provide the AI with a specific context, persona, or area of expertise. They are most powerful in <strong>Muse Mode</strong>, where you can combine multiple focuses to create a highly specialized AI assistant.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {FOCUSES.map(focus => (
                <div key={focus.id} className="p-3 bg-[var(--bg-tertiary)] rounded-lg not-prose">
                  <h4 className="font-semibold text-[var(--text-primary)] text-sm">{focus.name}</h4>
                  <p className="text-xs text-[var(--text-secondary)]">{focus.description}</p>
                </div>
              ))}
            </div>
        </>
      )}
      {activeSection === 'profiles' && (
        <>
          <h2>Session Profiles</h2>
          <p>Profiles are saved configurations that let you quickly switch between your favorite workflows. A profile stores a default set of AI behaviors and interface settings.</p>
          <h3>What a Profile Includes:</h3>
          <ul>
            <li>Default AI Mode</li>
            <li>Default set of Focuses</li>
            <li>Default settings for Web Search and Predictive Text</li>
            <li>A custom Writing Style for predictive text</li>
            <li>Optional default interface settings (like UI Density or Font Size)</li>
          </ul>
          <p>You can create, edit, and manage your profiles in <strong>Settings {'>'} Profiles</strong>. Once a profile is selected from the header, any new tabs you create will automatically use its default settings.</p>
        </>
      )}
      {activeSection === 'faq' && (
        <>
          <h2>Frequently Asked Questions</h2>
          <h4>How is my data stored?</h4>
          <p>By default, all your projects and sessions are stored locally in your browser. If you create an account, you can choose to save your data to our secure (simulated) cloud service, allowing you to access your work from anywhere.</p>
          
          <h4>Is my data private?</h4>
          <p>Yes. When using local storage, your data never leaves your computer. When using cloud storage, your data is associated with your account and is not shared. Prompts are sent to the Google Gemini API to generate responses.</p>

          <h4>Why are some modes slower than others?</h4>
          <p>Modes like <strong>Thinker</strong> and <strong>Professor</strong> use more advanced models and reasoning techniques, which can take longer to generate a response. <strong>Quick</strong> mode is optimized for speed and low latency.</p>
        </>
      )}
    </main>
  );
};


export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<DocSection>('welcome');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-2xl w-full max-w-4xl flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ height: 'calc(100vh - 4rem)' }}
      >
        <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-[var(--border-primary)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Icon name="question-mark-circle" className="w-6 h-6" />
            Help & Documentation
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]" title="Close help">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <Sidebar activeSection={activeSection} onSelect={setActiveSection} />
          <Content activeSection={activeSection} />
        </div>

        <footer className="flex-shrink-0 p-4 border-t border-[var(--border-primary)] text-center">
             <button
                onClick={onClose}
                className="px-6 py-2 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors"
                title="Close this window"
            >
                Got it!
            </button>
        </footer>
      </div>
    </div>
  );
};