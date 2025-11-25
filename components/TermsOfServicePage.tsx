import React from 'react';
import { Icon } from './Icon';

interface PageProps {
  onNavigate: (page: 'app') => void;
}

export const TermsOfServicePage: React.FC<PageProps> = ({ onNavigate }) => {
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
        <h1>TERMS OF SERVICE</h1>
        <p><em>Last updated: November 18, 2025</em></p>
        
        <h2>1. AGREEMENT TO TERMS</h2>
        <p>These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Connie Chong doing business as The Muse Engine ("we," "us," or "our"), concerning your access to and use of the https://www.themuseengines.com website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site"). You agree that by accessing the Site, you have read, understood, and agreed to be bound by all of these Terms of Service. IF YOU DO NOT AGREE WITH ALL OF THESE TERMS OF SERVICE, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SITE AND YOU MUST DISCONTINUE USE IMMEDIATELY.</p>
        
        <h2>2. INTELLECTUAL PROPERTY RIGHTS</h2>
        <p>Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights and unfair competition laws of the United States, international copyright laws, and international conventions.</p>
        
        <h2>3. USER REPRESENTATIONS</h2>
        <p>By using the Site, you represent and warrant that: (1) you have the legal capacity and you agree to comply with these Terms of Service; (2) you are not a minor in the jurisdiction in which you reside; (3) you will not access the Site through automated or non-human means, whether through a bot, script, or otherwise; (4) you will not use the Site for any illegal or unauthorized purpose; and (5) your use of the Site will not violate any applicable law or regulation.</p>
        
        <h2>4. PROHIBITED ACTIVITIES</h2>
        <p>You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.</p>
        
        <h2>5. LIMITATION OF LIABILITY</h2>
        <p>IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SITE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR LIABILITY TO YOU FOR ANY CAUSE WHATSOEVER AND REGARDLESS OF THE FORM OF THE ACTION, WILL AT ALL TIMES BE LIMITED TO THE AMOUNT PAID, IF ANY, BY YOU TO US DURING THE SIX (6) MONTH PERIOD PRIOR TO ANY CAUSE OF ACTION ARISING.</p>
        
        <h2>6. USER DATA</h2>
        <p>We will maintain certain data that you transmit to the Site for the purpose of managing the performance of the Site, as well as data relating to your use of the Site. Although we perform regular routine backups of data, you are solely responsible for all data that you transmit or that relates to any activity you have undertaken using the Site. You agree that we shall have no liability to you for any loss or corruption of any such data, and you hereby waive any right of action against us arising from any such loss or corruption of such data.</p>
        
        <h2>7. CONTACT US</h2>
        <p>In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at:</p>
        <div className="not-prose text-sm bg-[var(--bg-tertiary)] p-4 rounded-lg">
          <p className="font-sans">
              The Muse Engine<br />
              341 4th St<br />
              Palisades Park, NJ 07650<br />
              United States<br />
              Email: themuseengine@pm.me
          </p>
        </div>
      </main>
    </div>
  );
};