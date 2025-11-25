
import React from 'react';
import { Icon } from './Icon';

interface PageProps {
  onNavigate: (page: 'app') => void;
}

export const PrivacyPolicyPage: React.FC<PageProps> = ({ onNavigate }) => {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen font-sans">
      <header className="sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md z-10">
        <div className="max-w-5xl mx-auto p-4 flex items-center">
            <button
                onClick={() => onNavigate('app')}
                className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
                <Icon name="chevron-left" className="w-5 h-5" />
                Back to App
            </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-8 prose-custom">
        <h1>Privacy Policy</h1>
        <p><em>Last Updated: {new Date().toLocaleDateString()}</em></p>
        
        <h2>1. Introduction</h2>
        <p>This is a placeholder for your Privacy Policy. A privacy policy is a statement or a legal document that discloses some or all of the ways a party gathers, uses, discloses, and manages a customer or client's data. It fulfills a legal requirement to protect a customer or client's privacy.</p>
        
        <h2>2. Information We Collect</h2>
        <p>You should detail the types of information you collect here. This may include:</p>
        <ul>
          <li>Personal identification information (Name, email address, etc.)</li>
          <li>Usage data (how the service is accessed and used)</li>
          <li>Cookies and tracking data</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>Explain why you are collecting the data. Common reasons include:</p>
        <ul>
            <li>To provide and maintain our Service</li>
            <li>To notify you about changes to our Service</li>
            <li>To provide customer support</li>
            <li>To gather analysis or valuable information so that we can improve our Service</li>
        </ul>

        <h2>4. Data Storage and Security</h2>
        <p>Describe where and how you store user data, and what security measures are in place to protect it.</p>
        
        <h2>5. Your Data Protection Rights</h2>
        <p>Inform users of their rights regarding their data, such as the right to access, update, or delete their information.</p>

        <h2>6. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please provide a way for users to contact you.</p>
      </main>
    </div>
  );
};
