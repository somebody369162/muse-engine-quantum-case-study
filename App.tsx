

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InputController } from './components/InputController';
import { ResultsFeed } from './components/ResultsFeed';
import { Header } from './components/Header';
import { generateStream, generatePlan } from './services/gemini';
import { Mode, Focus, type Result, type Tab, type Project, type SavedPrompt, type StoragePreference, type ResponseVersion, type Appearance, type DocumentSettings, type User, type InterfaceSettings, type Profile, type DocumentTemplate, type PlanStep } from './types';
import * as auth from './services/auth';
import { Content } from '@google/genai';
import { LiveConversation } from './components/LiveConversation';
import { ScreenView } from './components/ScreenView';
import { CustomPromptModal } from './components/CustomPromptModal';
import { Icon } from './components/Icon';
import { Menu } from './components/Menu';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { DocumentEditorModal } from './components/DocumentEditorModal';
import { AuthModal } from './components/AuthModal';
import { SignUpSuggestionModal } from './components/SignUpSuggestionModal';
import { OnboardingTour } from './components/OnboardingTour';
import { HistorySidebar } from './components/HistorySidebar';
import * as soundService from './services/sound';
import { useNotifications } from './components/Notifications';
import { DEFAULT_PROFILES, DEFAULT_TEMPLATES, MODES } from './constants';
import { UserAgreementModal } from './components/UserAgreementModal';
import { Footer } from './components/Footer';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';
import { NexusView } from './components/NexusView';

const PROJECTS_STORAGE_KEY_PREFIX = 'muse-engine-projects';
const PROFILES_STORAGE_KEY_PREFIX = 'muse-engine-profiles';
const TEMPLATES_STORAGE_KEY_PREFIX = 'muse-engine-templates';
const ACTIVE_PROJECT_ID_KEY_PREFIX = 'muse-engine-active-project-id';
const THEME_STORAGE_KEY = 'muse-engine-theme';
const APPEARANCE_STORAGE_KEY = 'muse-engine-appearance';
const STORAGE_PREFERENCE_KEY = 'muse-engine-storage-preference';
const INTERFACE_SETTINGS_KEY = 'muse-engine-interface-settings';
const TOUR_COMPLETED_KEY = 'muse-engine-tour-completed';
const SIDEBAR_WIDTH_KEY = 'muse-engine-sidebar-width';
const SIDEBAR_COLLAPSED_KEY = 'muse-engine-sidebar-collapsed';
const AGREEMENT_ACCEPTED_KEY = 'muse-engine-agreement-accepted';


const getProjectsKey = (user: User | null) => user ? `${PROJECTS_STORAGE_KEY_PREFIX}-${user.id}` : `${PROJECTS_STORAGE_KEY_PREFIX}-guest`;
const getProfilesKey = (user: User | null) => user ? `${PROFILES_STORAGE_KEY_PREFIX}-${user.id}` : `${PROFILES_STORAGE_KEY_PREFIX}-guest`;
const getTemplatesKey = (user: User | null) => user ? `${TEMPLATES_STORAGE_KEY_PREFIX}-${user.id}` : `${TEMPLATES_STORAGE_KEY_PREFIX}-guest`;
const getActiveProjectIdKey = (user: User | null) => user ? `${ACTIVE_PROJECT_ID_KEY_PREFIX}-${user.id}` : `${ACTIVE_PROJECT_ID_KEY_PREFIX}-guest`;

const createNewTab = (name: string = "New Session", profile?: Profile | null): Tab => ({
  id: new Date().toISOString() + Math.random(),
  name,
  results: [],
  selectedMode: profile?.defaultMode || Mode.MUSE,
  selectedFocuses: profile?.defaultFocuses || [],
  searchTerm: '',
  isWebSearchEnabled: profile?.defaultIsWebSearchEnabled ?? false,
  isPredictiveTextEnabled: profile?.defaultIsPredictiveTextEnabled ?? true,
  writingStyle: profile?.defaultWritingStyle || '',
  documentContent: `# New Document\n\nStart writing here. Use the toolbar below to customize your writing assistance.\n`,
  documentSettings: {
    isPredictiveTextEnabled: true,
    useCustomFocuses: false,
    focuses: [],
    writingStyle: '',
  },
});

const createNewProject = (name: string = "Default Project"): Project => {
  const newTab = createNewTab();
  return {
    id: `proj_${new Date().toISOString()}${Math.random()}`,
    name,
    tabs: [newTab],
    activeTabId: newTab.id,
    savedPrompts: [],
  };
};

const getFriendlyErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) {
        if (!navigator.onLine) {
            return "You appear to be offline. Please check your internet connection.";
        }
        if (error.message.includes('API_KEY')) {
            return "The API key is missing or invalid. Please configure it to use the AI features.";
        }
        if (error.message.toLowerCase().includes('quota')) {
            return "You have exceeded your API quota. Please check your account status.";
        }
        if (error.message.toLowerCase().includes('fetch')) {
             return "A network error occurred. Please check your connection and try again.";
        }
        return error.message.replace('Gemini API Error:', '').trim();
    }
    return 'An unexpected error occurred. Please try again.';
};


const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [isDataReady, setIsDataReady] = useState(false);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isDocumentEditorOpen, setIsDocumentEditorOpen] = useState<boolean>(false);
  const [isSignUpSuggestionOpen, setIsSignUpSuggestionOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark') || 'dark');
  const [appearance, setAppearance] = useState<Appearance>(() => (localStorage.getItem(APPEARANCE_STORAGE_KEY) as Appearance) || 'celestial');
  const [storagePreference, setStoragePreference] = useState<StoragePreference>(() => (localStorage.getItem(STORAGE_PREFERENCE_KEY) as StoragePreference) || 'local');
  const [interfaceSettings, setInterfaceSettings] = useState<InterfaceSettings>(() => {
    try {
      const stored = localStorage.getItem(INTERFACE_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...parsed, soundEffects: parsed.soundEffects ?? false };
      }
    } catch (e) { console.error("Failed to parse interface settings", e); }
    return { density: 'comfortable', animations: 'full', fontSize: 'medium', soundEffects: false, showExperimentalModes: false };
  });

  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isTourActive, setIsTourActive] = useState(() => !localStorage.getItem(TOUR_COMPLETED_KEY));
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || 280);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAgreementAccepted, setIsAgreementAccepted] = useState(() => !!localStorage.getItem(AGREEMENT_ACCEPTED_KEY));
  const [page, setPage] = useState<'app' | 'privacy' | 'terms'>('app');
  
  // State for Nexus Mode
  const [isNexusActive, setIsNexusActive] = useState(false);
  const [nexusPrompt, setNexusPrompt] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { addNotification } = useNotifications();
  const runningAgentsRef = useRef<Set<string>>(new Set());

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    label: string;
    initialValue: string;
    onConfirm: (value: string) => void;
  } | null>(null);
  
  const saveTimeoutRef = useRef<number | null>(null);

  // Effect 1: Runs once on mount to establish the initial user state.
  useEffect(() => {
    const user = auth.getPersistedUser();
    setCurrentUser(user);
    if (localStorage.getItem(TOUR_COMPLETED_KEY)) {
      setIsTourActive(false);
    }
  }, []);

  // Effect 2: Main data loading and validation effect. Runs when the user context is established or changed.
  useEffect(() => {
    if (currentUser === undefined) return; // Wait for the first effect to determine the user.

    setIsDataReady(false); // Start loading process

    const loadAndValidateData = async () => {
        const projectsKey = getProjectsKey(currentUser);
        const profilesKey = getProfilesKey(currentUser);
        const templatesKey = getTemplatesKey(currentUser);
        const activeProjectKey = getActiveProjectIdKey(currentUser);

        // Fetching data from cloud/local
        let loadedProjects: Project[] | null = null;
        let loadedProfiles: Profile[] | null = null;
        let loadedTemplates: DocumentTemplate[] | null = null;

        if (currentUser) {
            loadedProjects = await auth.loadDataForUser(currentUser.id, 'projects') as Project[] | null;
            loadedProfiles = await auth.loadDataForUser(currentUser.id, 'profiles') as Profile[] | null;
            loadedTemplates = await auth.loadDataForUser(currentUser.id, 'templates') as DocumentTemplate[] | null;
        }
        
        try { if (!loadedProjects) { const local = localStorage.getItem(projectsKey); if (local) loadedProjects = JSON.parse(local); }} catch (e) { console.error('Failed to parse local projects', e); }
        try { if (!loadedProfiles) { const local = localStorage.getItem(profilesKey); if (local) loadedProfiles = JSON.parse(local); }} catch (e) { console.error('Failed to parse local profiles', e); }
        try { if (!loadedTemplates) { const local = localStorage.getItem(templatesKey); if (local) loadedTemplates = JSON.parse(local); }} catch (e) { console.error('Failed to parse local templates', e); }
        
        let finalProjects = (loadedProjects && loadedProjects.length > 0) ? loadedProjects : [createNewProject()];
        const finalProfiles = (loadedProfiles && loadedProfiles.length > 0) ? loadedProfiles : DEFAULT_PROFILES;
        const finalTemplates = (loadedTemplates && loadedTemplates.length > 0) ? loadedTemplates : DEFAULT_TEMPLATES;
        
        // --- DATA VALIDATION AND REPAIR ---
        finalProjects = finalProjects.map(p => {
            if (!p.tabs || p.tabs.length === 0) {
                const newTab = createNewTab();
                p.tabs = [newTab];
                p.activeTabId = newTab.id;
            }
            if (!p.tabs.some(t => t.id === p.activeTabId)) {
                p.activeTabId = p.tabs[0].id;
            }
            return p;
        });
        
        const savedActiveId = localStorage.getItem(activeProjectKey);
        const newActiveId = finalProjects.find(p => p.id === savedActiveId) ? savedActiveId : (finalProjects[0]?.id || null);

        setProjects(finalProjects);
        setProfiles(finalProfiles);
        setDocumentTemplates(finalTemplates);
        setActiveProjectId(newActiveId);

        setIsDataReady(true); // Unlock rendering
    };

    loadAndValidateData();
  }, [currentUser]);

  const saveData = async (key: string, data: any[], user: User | null, storageType: 'projects' | 'profiles' | 'templates') => {
      if (!user) { // Guest user
          try { if (data.length > 0) localStorage.setItem(key, JSON.stringify(data)); else localStorage.removeItem(key); } catch (err) { console.error(`Failed to save guest ${storageType} to local storage:`, err); }
          return;
      }
      
      setSaveStatus('saving');
      if (storagePreference === 'local' || storagePreference === 'both') {
          try { if (data.length > 0) localStorage.setItem(key, JSON.stringify(data)); else localStorage.removeItem(key); } catch (err) { console.error(`Failed to save ${storageType} to local storage:`, err); }
      }
      if ((storagePreference === 'cloud' || storagePreference === 'both')) {
          await auth.saveDataForUser(user.id, data, storageType);
      }
  };
  
  const saveProjects = (data: Project[], user: User | null) => saveData(getProjectsKey(user), data, user, 'projects');
  const saveProfiles = (data: Profile[], user: User | null) => saveData(getProfilesKey(user), data, user, 'profiles');
  const saveTemplates = (data: DocumentTemplate[], user: User | null) => saveData(getTemplatesKey(user), data, user, 'templates');

  // Debounced autosave
  useEffect(() => {
    if (!isDataReady) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setSaveStatus('idle');
    saveTimeoutRef.current = window.setTimeout(() => {
      saveProjects(projects, currentUser);
      saveProfiles(profiles, currentUser);
      saveTemplates(documentTemplates, currentUser);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1500);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [projects, profiles, documentTemplates, storagePreference, currentUser, isDataReady]);
  
  useEffect(() => {
    if (!isDataReady) return;
    const activeProjectKey = getActiveProjectIdKey(currentUser);
    if (activeProjectId) {
      localStorage.setItem(activeProjectKey, activeProjectId);
    }
  }, [activeProjectId, currentUser, isDataReady]);

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const ALL_APPEARANCE_CLASSES = ['appearance-vanta', 'appearance-legacy', 'appearance-serene', 'appearance-arcade', 'appearance-solar', 'appearance-oceanic', 'appearance-celestial'];
    document.body.classList.remove(...ALL_APPEARANCE_CLASSES);
    document.body.classList.add(`appearance-${appearance}`);
    localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
  }, [appearance]);

  useEffect(() => {
    const body = document.body;
    body.classList.remove('density-comfortable', 'density-compact', 'animations-full', 'animations-minimal', 'font-size-small', 'font-size-medium', 'font-size-large');
    body.classList.add(`density-${interfaceSettings.density}`);
    body.classList.add(`animations-${interfaceSettings.animations}`);
    body.classList.add(`font-size-${interfaceSettings.fontSize}`);
    localStorage.setItem(INTERFACE_SETTINGS_KEY, JSON.stringify(interfaceSettings));
    soundService.setSoundEnabled(interfaceSettings.soundEffects);
    
    // Inject experimental modes into MODES constant if enabled
    const nexusMode = MODES.find(m => m.id === Mode.NEXUS);
    if (!interfaceSettings.showExperimentalModes && nexusMode) {
        // We don't modify constants directly usually, but here we rely on filtering in the UI layer (ModeSelector)
    }
  }, [interfaceSettings]);

  // Global click handler to play sounds for UI interactions
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
        if (!interfaceSettings.soundEffects) return;
        const target = event.target as HTMLElement;
        const interactiveElement = target.closest('button, a, [role="button"], [role="switch"], [role="menuitem"], input[type="checkbox"], label');
        if (interactiveElement) {
            const role = interactiveElement.getAttribute('role');
            if (role === 'switch' || interactiveElement.tagName.toLowerCase() === 'input' && (interactiveElement as HTMLInputElement).type === 'checkbox') {
                const isChecked = role === 'switch' ? interactiveElement.getAttribute('aria-checked') === 'true' : (interactiveElement as HTMLInputElement).checked;
                isChecked ? soundService.playToggleOff() : soundService.playToggleOn();
            } else {
                soundService.playClick();
            }
        }
    };
    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, [interfaceSettings.soundEffects]);

  useEffect(() => { if (currentUser) { localStorage.setItem(STORAGE_PREFERENCE_KEY, storagePreference); } }, [storagePreference, currentUser]);
  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);
  useEffect(() => { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed)); }, [isSidebarCollapsed]);

  const executePlan = useCallback(async (resultId: string, startStepIndex: number = 0) => {
    runningAgentsRef.current.add(resultId);

    setProjects(prevProjects => {
      const project = prevProjects.find(p => p.id === activeProjectId);
      if (!project) { runningAgentsRef.current.delete(resultId); return prevProjects; }
      const tab = project.tabs.find(t => t.id === project.activeTabId);
      if (!tab) { runningAgentsRef.current.delete(resultId); return prevProjects; }
      const result = tab.results.find(r => r.id === resultId);
      if (!result || !result.plan) { runningAgentsRef.current.delete(resultId); return prevProjects; }
      return prevProjects;
    });


    for (let i = startStepIndex; ; ) {
        let shouldContinue = true;
        let nextStepIndex: number | null = null;
        let errorOccurred = false;

        await new Promise<void>(resolve => {
            setProjects(prevProjects => {
                const project = prevProjects.find(p => p.id === activeProjectId);
                const tab = project?.tabs.find(t => t.id === project.activeTabId);
                const result = tab?.results.find(r => r.id === resultId);

                if (!result || !result.plan || i >= result.plan.length) {
                    shouldContinue = false;
                    resolve();
                    return prevProjects;
                }

                const agentState = result.agentState;
                if (!runningAgentsRef.current.has(resultId) || agentState?.status !== 'running') {
                    shouldContinue = false;
                    resolve();
                    return prevProjects;
                }
                
                const step = result.plan[i];
                
                if (step.inputPrompt && !step.result) {
                    shouldContinue = false;
                    resolve();
                    return prevProjects.map(p => p.id === activeProjectId ? { ...p, tabs: p.tabs.map(t => t.id === p.activeTabId ? { ...t, results: t.results.map(r => {
                        if (r.id !== resultId) return r;
                        const newPlan = r.plan!.map((s, idx) => idx === i ? { ...s, status: 'awaiting-input' as const } : s);
                        return { ...r, plan: newPlan, agentState: { status: 'paused', currentStepIndex: i } };
                    })} : t)} : p);
                }

                const projectsWithInProgress = prevProjects.map(p => p.id === activeProjectId ? { ...p, tabs: p.tabs.map(t => t.id === p.activeTabId ? { ...t, results: t.results.map(r => {
                    if (r.id !== resultId) return r;
                    const newPlan = r.plan!.map((s, idx) => idx === i ? { ...s, status: 'in-progress' as const } : s);
                    return { ...r, plan: newPlan, agentState: { ...r.agentState!, currentStepIndex: i } };
                })} : t)} : p);
                
                const promptForStep = step.result ? `Based on my previous work on this step: "${step.result}", now do this: ${step.description}` : step.description;
                const previousStepsContext = result.plan.slice(0, i).map(s => `Step: ${s.description}\nResult: ${s.result || 'N/A'}`).join('\n\n');

                (async () => {
                    try {
                        let currentResponse = '';
                        const stream = generateStream(promptForStep, Mode.THINKER, result.focuses, previousStepsContext, undefined, true);
                        for await (const chunk of stream) {
                            if (!runningAgentsRef.current.has(resultId)) break;
                            currentResponse += (chunk.textChunk || '');

                            setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tabs: p.tabs.map(t => t.id === p.activeTabId ? { ...t, results: t.results.map(r => {
                                if (r.id !== resultId) return r;
                                const newPlan = r.plan!.map((s, idx) => idx === i ? { ...s, result: currentResponse, citations: chunk.citations || s.citations } : s);
                                return { ...r, plan: newPlan };
                            })} : t)} : p));
                        }
                        if (runningAgentsRef.current.has(resultId)) {
                             nextStepIndex = i + 1;
                        }
                    } catch (err) {
                        errorOccurred = true;
                        const errorMessage = getFriendlyErrorMessage(err);
                        setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tabs: p.tabs.map(t => t.id === p.activeTabId ? { ...t, results: t.results.map(r => {
                            if (r.id !== resultId) return r;
                            const newPlan = r.plan!.map((s, idx) => idx === i ? { ...s, status: 'error' as const, result: `Error: ${errorMessage}` } : s);
                            return { ...r, plan: newPlan, agentState: { ...r.agentState!, status: 'error' } };
                        })} : t)} : p));
                    } finally {
                        resolve();
                    }
                })();

                return projectsWithInProgress;
            });
        });
        
        if (!shouldContinue) break;

        if (!errorOccurred && nextStepIndex !== null) {
            setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tabs: p.tabs.map(t => t.id === p.activeTabId ? { ...t, results: t.results.map(r => {
                if (r.id !== resultId) return r;
                const newPlan = r.plan!.map((s, idx) => idx === i ? { ...s, status: 'completed' as const } : s);
                return { ...r, plan: newPlan };
            })} : t)} : p));
            i = nextStepIndex;
        } else {
            break;
        }
    }


    runningAgentsRef.current.delete(resultId);
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tabs: p.tabs.map(t => t.id === p.activeTabId ? { ...t, results: t.results.map(r => {
        if (r.id !== resultId) return r;
        if (r.agentState?.status === 'stopped' || r.agentState?.status === 'error') return r;
        const allCompleted = r.plan?.every(s => s.status === 'completed');
        return { ...r, agentState: { ...r.agentState!, status: allCompleted ? 'completed' : 'paused' } };
    })} : t)} : p));

  }, [activeProjectId]);


  const handleSignIn = async (email: string, password: string, rememberMe: boolean) => {
    const user = await auth.signIn(email, password, rememberMe);
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };
  const handleSignUp = async (name: string, email: string, password: string) => {
    const user = await auth.signUp(name, email, password);
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };
  const handleSignOut = async () => {
    await auth.signOut();
    setCurrentUser(null);
  };
  const handleTourComplete = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    setIsTourActive(false);
  };

  const handleAgree = () => {
    localStorage.setItem(AGREEMENT_ACCEPTED_KEY, 'true');
    setIsAgreementAccepted(true);
  };
  
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeTab = activeProject?.tabs.find(t => t.id === activeProject.activeTabId);

  const updateProject = useCallback((projectId: string, updateFn: (project: Project) => Project) => {
    setProjects(prevProjects => prevProjects.map(p => (p.id === projectId ? updateFn(p) : p)));
  }, []);

  const updateActiveTabData = useCallback((updates: Partial<Tab>) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, project => ({
      ...project,
      tabs: project.tabs.map(tab => tab.id === project.activeTabId ? { ...tab, ...updates } : tab)
    }));
  }, [activeProjectId, updateProject]);


  if (page === 'privacy') {
    return <PrivacyPolicyPage onNavigate={setPage} />;
  }
  if (page === 'terms') {
    return <TermsOfServicePage onNavigate={setPage} />;
  }

  if (!isAgreementAccepted) {
    return <UserAgreementModal isOpen={true} mode="initial" onAgree={handleAgree} onClose={() => {}} />;
  }

  if (!isDataReady || !activeProject || !activeTab) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)] text-center">
        <div>
          <Icon name="sync" className="w-12 h-12 text-[var(--accent-primary)] animate-spin mb-4" />
          <p className="text-lg text-[var(--text-secondary)]">Initializing...</p>
        </div>
      </div>
    );
  }
  
  const handleAddProject = () => {
    setModalState({
        isOpen: true, title: 'Create New Project', label: 'Project Name', initialValue: `Project ${projects.length + 1}`,
        onConfirm: (newName) => {
            const newProject = createNewProject(newName);
            setProjects(prevProjects => [...prevProjects, newProject]);
            setActiveProjectId(newProject.id);
            setModalState(null);
        },
    });
  };
  const handleRenameProject = (projectId: string) => {
    const projectToRename = projects.find(p => p.id === projectId);
    if (!projectToRename) return;
    setModalState({
        isOpen: true, title: 'Rename Project', label: 'New Project Name', initialValue: projectToRename.name,
        onConfirm: (newName) => {
            if (newName && newName !== projectToRename.name) {
                setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName } : p));
            }
            setModalState(null);
        },
    });
  };
  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) { addNotification({type: 'error', title: 'Cannot Delete', message: 'You cannot delete the only project.'}); return; }
    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;
    if (window.confirm(`Are you sure you want to delete the project "${projectToDelete.name}"? This action cannot be undone.`)) {
        setProjects(prev => {
            const newProjects = prev.filter(p => p.id !== projectId);
            if (activeProjectId === projectId) { setActiveProjectId(newProjects[0].id); }
            return newProjects;
        });
    }
  };
  const handleSelectProject = (projectId: string) => { setActiveProjectId(projectId); };
  
  const handleAddTab = () => {
    if (!activeProjectId) return;
    const activeProject = projects.find(p => p.id === activeProjectId);
    const activeProfile = profiles.find(p => p.id === activeProject?.activeProfileId);
    const newTab = createNewTab(`Session ${activeProject.tabs.length + 1}`, activeProfile);
    updateProject(activeProjectId, project => ({ ...project, tabs: [...project.tabs, newTab], activeTabId: newTab.id, }));
  };
  const handleSelectTab = (tabId: string) => { if (!activeProjectId) return; updateProject(activeProjectId, project => ({ ...project, activeTabId: tabId })); };
  const handleCloseTab = (tabIdToClose: string) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, project => {
        const newTabs = project.tabs.filter(tab => tab.id !== tabIdToClose);
        if (newTabs.length === 0) {
            const newTab = createNewTab();
            return { ...project, tabs: [newTab], activeTabId: newTab.id };
        }
        let newActiveTabId = project.activeTabId;
        if (project.activeTabId === tabIdToClose) {
            const closingTabIndex = project.tabs.findIndex(tab => tab.id === tabIdToClose);
            const newActiveIndex = Math.max(0, closingTabIndex - 1);
            newActiveTabId = newTabs[newActiveIndex].id;
        }
        return { ...project, tabs: newTabs, activeTabId: newActiveTabId };
    });
  };
  const handleRenameTab = (tabIdToRename: string, newName: string) => {
    if (!activeProjectId || !newName.trim()) return;
    updateProject(activeProjectId, project => ({ ...project, tabs: project.tabs.map(tab => tab.id === tabIdToRename ? { ...tab, name: newName.trim() } : tab) }));
  };
  const handleDuplicateTab = (tabIdToDuplicate: string) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, project => {
      const tabToDuplicate = project.tabs.find(t => t.id === tabIdToDuplicate);
      if (!tabToDuplicate) return project;
      const newTab: Tab = { ...tabToDuplicate, id: new Date().toISOString() + Math.random(), name: `${tabToDuplicate.name} (Copy)` };
      const originalIndex = project.tabs.findIndex(t => t.id === tabIdToDuplicate);
      const newTabs = [...project.tabs];
      newTabs.splice(originalIndex + 1, 0, newTab);
      return { ...project, tabs: newTabs, activeTabId: newTab.id };
    });
  };
  const handleReorderTabs = (draggedId: string, targetId: string) => {
    if (draggedId === targetId || !activeProjectId) return;
    updateProject(activeProjectId, project => {
        const tabs = [...project.tabs];
        const draggedIndex = tabs.findIndex(t => t.id === draggedId);
        const targetIndex = tabs.findIndex(t => t.id === targetId);
        if (draggedIndex === -1 || targetIndex === -1) return project;
        const [draggedTab] = tabs.splice(draggedIndex, 1);
        tabs.splice(targetIndex, 0, draggedTab);
        return { ...project, tabs };
    });
  };
  const handleReorderProjects = (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;
      setProjects(prev => {
          const projects = [...prev];
          const draggedIndex = projects.findIndex(p => p.id === draggedId);
          const targetIndex = projects.findIndex(p => p.id === targetId);
          if (draggedIndex === -1 || targetIndex === -1) return prev;
          const [draggedProject] = projects.splice(draggedIndex, 1);
          projects.splice(targetIndex, 0, draggedProject);
          return projects;
      });
  };
  const handleDocumentContentChange = (content: string) => { updateActiveTabData({ documentContent: content }); };
  const handleDocumentSettingsChange = (settings: DocumentSettings) => { updateActiveTabData({ documentSettings: settings }); };
  
  const chatHistoryForPrediction: Content[] = activeTab.results.slice(-10).reverse().flatMap(r => {
        const activeVersion = r.versions[r.activeVersionIndex];
        if (!activeVersion.response.startsWith('Error:')) { return [{ role: 'user', parts: [{ text: r.prompt }] }, { role: 'model', parts: [{ text: activeVersion.response }] }]; }
        return [];
      });

  const handleAgentControl = (resultId: string, command: 'start' | 'pause' | 'stop') => {
    setProjects(prev => {
        const project = prev.find(p => p.id === activeProjectId);
        if (!project) return prev;
        const tab = project.tabs.find(t => t.id === project.activeTabId);
        if (!tab) return prev;
        const result = tab.results.find(r => r.id === resultId);
        if (!result || !result.agentState) return prev;
        
        let newStatus: 'idle' | 'running' | 'paused' | 'stopped' | 'error' | 'completed' = result.agentState.status;
        let shouldStartExecution = false;
        let startStep = result.agentState.currentStepIndex || 0;

        switch(command) {
            case 'start':
                if (result.agentState.status === 'paused') {
                    newStatus = 'running';
                    shouldStartExecution = true;
                } else { 
                    newStatus = 'running';
                    shouldStartExecution = true;
                    startStep = 0;
                }
                break;
            case 'pause':
                newStatus = 'paused';
                runningAgentsRef.current.delete(resultId);
                break;
            case 'stop':
                newStatus = 'stopped';
                runningAgentsRef.current.delete(resultId);
                break;
        }

        const newProjects = prev.map(p => p.id === activeProjectId ? { ...p, tabs: p.tabs.map(t => t.id === tab.id ? { ...t, results: t.results.map(r => {
            if (r.id !== resultId) return r;
            const newPlan = command === 'start' && result.agentState?.status !== 'paused' 
                ? r.plan?.map(s => ({ ...s, status: 'idle' as const, result: undefined, citations: undefined }))
                : r.plan;
            return { ...r, plan: newPlan, agentState: { ...r.agentState!, status: newStatus } };
        })} : t)} : p);
        
        if (shouldStartExecution) {
            executePlan(resultId, startStep);
        }
        return newProjects;
    });
  };
  
  const handleAgentUserInput = (resultId: string, stepId: string, userInput: string) => {
    const stepIndex = projects.find(p => p.id === activeProjectId)?.tabs.find(t => t.id === activeTab.id)?.results.find(r => r.id === resultId)?.plan?.findIndex(s => s.id === stepId);
    if (stepIndex === undefined || stepIndex === -1) return;

    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tabs: p.tabs.map(t => t.id === p.activeTabId ? { ...t, results: t.results.map(r => {
        if (r.id !== resultId) return r;
        const newPlan = r.plan!.map(s => s.id === stepId ? { ...s, result: `User input: "${userInput}"`, status: 'idle' as const } : s);
        return { ...r, plan: newPlan, agentState: { status: 'running', currentStepIndex: stepIndex } };
    })} : t)} : p));

    executePlan(resultId, stepIndex);
  };
  
  const handleGenerate = async (prompt: string, files: File[], mode: Mode, focuses: Focus[]) => {
    if (mode === Mode.NEXUS) {
        setNexusPrompt(prompt);
        setIsNexusActive(true);
        return;
    }

    if (isLoading) return;
    if (!prompt.trim() && files.length === 0) return;

    soundService.playSend();
    if (!currentUser && activeTab.results.length === 2) { setIsSignUpSuggestionOpen(true); }
    setIsLoading(true);
    
    if (mode === Mode.AGENT) {
        const newResult: Result = {
            id: new Date().toISOString() + Math.random(), prompt, mode, focuses,
            versions: [{ response: '', citations: [], timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
            activeVersionIndex: 0,
            agentState: { status: 'idle' },
            plan: [],
        };
        const activeResultId = newResult.id;
        updateActiveTabData({ results: [newResult, ...activeTab.results] });
        try {
            const rawPlan = await generatePlan(prompt);
            const plan: PlanStep[] = rawPlan.map((step: any) => ({
              id: `step_${Date.now()}_${Math.random()}`,
              description: step.description,
              inputPrompt: step.input_prompt,
              status: 'idle',
            }));
    
            setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tabs: p.tabs.map(t => t.id === activeTab.id ? { ...t, results: t.results.map(r => r.id === activeResultId ? { ...r, plan } : r) } : t)} : p));
        } catch (err) {
            const errorMessage = getFriendlyErrorMessage(err);
            addNotification({ type: 'error', title: 'Planning Failed', message: errorMessage });
            setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, tabs: p.tabs.map(t => t.id === activeTab.id ? { ...t, results: t.results.map(r => r.id === activeResultId ? { ...r, agentState: { status: 'error' } } : r) } : t)} : p));
        } finally {
            setIsLoading(false);
        }
        return;
    }

    const newVersion: ResponseVersion = { response: '', citations: [], timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const newResult: Result = { id: new Date().toISOString() + Math.random(), prompt, mode, focuses, versions: [newVersion], activeVersionIndex: 0 };
    const activeResultId = newResult.id;
    updateActiveTabData({ results: [newResult, ...activeTab.results] });
    try {
      let history: Content[] = [];
      let context: string | undefined;

      if (activeTab.sessionSummary) {
          context = `SESSION SUMMARY: ${activeTab.sessionSummary}\n\nUse this summary to inform your response.`;
      }

      if (mode === Mode.CHAT) {
        history = activeTab.results.filter(r => r.mode === Mode.CHAT).reverse().flatMap(r => {
            const activeVersion = r.versions[r.activeVersionIndex];
            if (!activeVersion.response.startsWith('Error:')) { return [{ role: 'user', parts: [{ text: r.prompt }] }, { role: 'model', parts: [{ text: activeVersion.response }] }]; }
            return [];
        });
      }

      let currentResponse = '';
      let firstChunkReceived = false;
      const stream = generateStream(prompt, mode, focuses, context, history, activeTab.isWebSearchEnabled, files);
      for await (const chunk of stream) {
          if (!firstChunkReceived) { soundService.playReceive(); firstChunkReceived = true; }
          currentResponse += (chunk.textChunk || '');
          
          setProjects(prev => prev.map(p => {
            if (p.id !== activeProjectId) return p;
            return { ...p, tabs: p.tabs.map(t => {
                if (t.id !== p.activeTabId) return t;
                const updatedResults = t.results.map(r => {
                    if (r.id === activeResultId) {
                        const newVersions = [...r.versions];
                        const activeVersion = newVersions[r.activeVersionIndex];
                        newVersions[r.activeVersionIndex] = { ...activeVersion, response: currentResponse, citations: chunk.citations || activeVersion.citations };
                        return { ...r, versions: newVersions };
                    }
                    return r;
                });
                return { ...t, results: updatedResults };
              }) };
          }));
      }
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err);
      console.error(errorMessage);
      addNotification({ type: 'error', title: 'Generation Failed', message: "There was an issue generating a response. See the message in the conversation for details." });
      setProjects(prev => prev.map(p => {
        if (p.id !== activeProjectId) return p;
        return { ...p, tabs: p.tabs.map(t => {
            if (t.id !== p.activeTabId) return t;
            return { ...t, results: t.results.map(r => {
                if (r.id === activeResultId) {
                  const newVersions = [...r.versions];
                  newVersions[r.activeVersionIndex] = { ...newVersions[r.activeVersionIndex], response: `Error: ${errorMessage}` };
                  return { ...r, versions: newVersions };
                }
                return r;
              }) };
          }) };
      }));
    } finally {
      setIsLoading(false);
    }
  };
  const handleClarify = async (originalResult: Result, userPrompt: string) => {
    if (isLoading) return;
    setIsLoading(true);
    soundService.playSend();
    const originalVersion = originalResult.versions[originalResult.activeVersionIndex];
    const newVersion: ResponseVersion = { response: '', citations: [], timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const newResult: Result = { id: new Date().toISOString() + Math.random(), prompt: userPrompt, mode: Mode.QUICK, versions: [newVersion], activeVersionIndex: 0 };
    updateActiveTabData({ results: [newResult, ...activeTab.results] });
    let currentResponse = '';
    try {
      let firstChunkReceived = false;
      const stream = generateStream(userPrompt, Mode.QUICK, originalResult.focuses, originalVersion.response, undefined, activeTab.isWebSearchEnabled);
      for await (const chunk of stream) {
        if (!firstChunkReceived) { soundService.playReceive(); firstChunkReceived = true; }
        currentResponse += (chunk.textChunk || '');
        setProjects(prev => prev.map(p => {
          if (p.id !== activeProjectId) return p;
          return { ...p, tabs: p.tabs.map(t => {
              if (t.id !== p.activeTabId) return t;
              return { ...t, results: t.results.map(r => {
                  if (r.id !== newResult.id) return r;
                  const newVersions = [...r.versions];
                  newVersions[0] = { ...newVersions[0], response: currentResponse };
                  return { ...r, versions: newVersions };
              }) };
            }) };
        }));
      }
    } catch (err) {
       const errorMessage = getFriendlyErrorMessage(err);
       console.error(errorMessage);
       addNotification({ type: 'error', title: 'Clarification Failed', message: errorMessage });
       setProjects(prev => prev.map(p => {
        if (p.id !== activeProjectId) return p;
        return { ...p, tabs: p.tabs.map(t => {
            if (t.id !== p.activeTabId) return t;
            return { ...t, results: t.results.map(r => {
              if (r.id !== newResult.id) return r;
              const newVersions = [...r.versions];
              newVersions[0] = { ...newVersions[0], response: `Error: ${errorMessage}` };
              return { ...r, versions: newVersions };
            }) };
          }) };
      }));
    } finally {
      setIsLoading(false);
    }
  };
  const handleGenerateAction = async (originalResult: Result, actionPrompt: string) => {
    if (isLoading) return;
    setIsLoading(true);
    soundService.playSend();
    const originalVersion = originalResult.versions[originalResult.activeVersionIndex];
    const newVersion: ResponseVersion = { response: '', citations: [], timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const newResult: Result = { id: new Date().toISOString() + Math.random(), prompt: actionPrompt, mode: Mode.QUICK, versions: [newVersion], activeVersionIndex: 0, focuses: originalResult.focuses };
    updateActiveTabData({ results: [newResult, ...activeTab.results] });
    let currentResponse = '';
    try {
        let firstChunkReceived = false;
        const context = `Original Prompt: "${originalResult.prompt}"\n\nOriginal Response:\n${originalVersion.response}`;
        const stream = generateStream(actionPrompt, Mode.QUICK, originalResult.focuses, context, undefined, activeTab.isWebSearchEnabled);

        for await (const chunk of stream) {
            if (!firstChunkReceived) { soundService.playReceive(); firstChunkReceived = true; }
            currentResponse += (chunk.textChunk || '');
            setProjects(prev => prev.map(p => {
                if (p.id !== activeProjectId) return p;
                return { ...p, tabs: p.tabs.map(t => {
                    if (t.id !== p.activeTabId) return t;
                    return { ...t, results: t.results.map(r => {
                        if (r.id !== newResult.id) return r;
                        const newVersions = [...r.versions];
                        newVersions[0] = { ...newVersions[0], response: currentResponse, citations: chunk.citations || newVersions[0].citations };
                        return { ...r, versions: newVersions };
                    }) };
                }) };
            }));
        }
    } catch (err) {
        const errorMessage = getFriendlyErrorMessage(err);
        console.error(errorMessage);
        addNotification({ type: 'error', title: 'Action Failed', message: errorMessage });
        setProjects(prev => prev.map(p => {
            if (p.id !== activeProjectId) return p;
            return { ...p, tabs: p.tabs.map(t => {
                if (t.id !== p.activeTabId) return t;
                return { ...t, results: t.results.map(r => {
                    if (r.id !== newResult.id) return r;
                    const newVersions = [...r.versions];
                    newVersions[0] = { ...newVersions[0], response: `Error: ${errorMessage}` };
                    return { ...r, versions: newVersions };
                }) };
            }) };
        }));
    } finally {
        setIsLoading(false);
    }
  };
    const handleSavePrompt = (result: Result) => {
    const promptName = window.prompt("Enter a name for this saved prompt:", result.prompt.substring(0, 30));
    if (promptName && activeProjectId) {
      const newSavedPrompt: SavedPrompt = {
        id: `sp_${Date.now()}`,
        name: promptName,
        prompt: result.prompt,
        mode: result.mode,
        focuses: result.focuses || [],
        isWebSearchEnabled: activeTab.isWebSearchEnabled,
      };
      updateProject(activeProjectId, p => ({
        ...p,
        savedPrompts: [...(p.savedPrompts || []), newSavedPrompt]
      }));
       addNotification({ type: 'success', title: 'Prompt Saved', message: `"${promptName}" has been added to your saved prompts for this project.` });
    }
  };
  
  const handleDeleteSavedPrompt = (promptId: string) => {
    if (activeProjectId) {
      updateProject(activeProjectId, p => ({
        ...p,
        savedPrompts: (p.savedPrompts || []).filter(sp => sp.id !== promptId)
      }));
    }
  };
  
  const handleRedoGeneration = async (resultId: string) => {
    const resultToRedo = activeTab.results.find(r => r.id === resultId);
    if (!resultToRedo || isLoading) return;
    
    soundService.playSend();
    setIsLoading(true);
    
    const newVersion: ResponseVersion = { response: '', citations: [], timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    
    setProjects(prev => prev.map(p => {
        if (p.id !== activeProjectId) return p;
        return { ...p, tabs: p.tabs.map(t => {
            if (t.id !== p.activeTabId) return t;
            return { ...t, results: t.results.map(r => {
                if (r.id !== resultId) return r;
                return { ...r, versions: [...r.versions, newVersion], activeVersionIndex: r.versions.length };
            })};
        })};
    }));

    try {
        let history: Content[] = [];
        if (resultToRedo.mode === Mode.CHAT) {
            const resultIndex = activeTab.results.findIndex(r => r.id === resultId);
            history = activeTab.results.slice(resultIndex + 1).reverse().flatMap(r => {
                const activeVersion = r.versions[r.activeVersionIndex];
                if (!activeVersion.response.startsWith('Error:')) {
                    return [{ role: 'user', parts: [{ text: r.prompt }] }, { role: 'model', parts: [{ text: activeVersion.response }] }];
                }
                return [];
            });
        }
        
        let currentResponse = '';
        let firstChunkReceived = false;
        const stream = generateStream(resultToRedo.prompt, resultToRedo.mode, resultToRedo.focuses, undefined, history, activeTab.isWebSearchEnabled, []);

        for await (const chunk of stream) {
            if (!firstChunkReceived) { soundService.playReceive(); firstChunkReceived = true; }
            currentResponse += (chunk.textChunk || '');
            setProjects(prev => prev.map(p => {
                if (p.id !== activeProjectId) return p;
                return { ...p, tabs: p.tabs.map(t => {
                    if (t.id !== p.activeTabId) return t;
                    return { ...t, results: t.results.map(r => {
                        if (r.id !== resultId) return r;
                        const newVersions = [...r.versions];
                        newVersions[r.activeVersionIndex] = { ...newVersions[r.activeVersionIndex], response: currentResponse, citations: chunk.citations || newVersions[r.activeVersionIndex].citations };
                        return { ...r, versions: newVersions };
                    }) };
                }) };
            }));
        }
    } catch (err) {
        const errorMessage = getFriendlyErrorMessage(err);
        addNotification({ type: 'error', title: 'Regeneration Failed', message: errorMessage });
         setProjects(prev => prev.map(p => {
            if (p.id !== activeProjectId) return p;
            return { ...p, tabs: p.tabs.map(t => {
                if (t.id !== p.activeTabId) return t;
                return { ...t, results: t.results.map(r => {
                    if (r.id !== resultId) return r;
                    const newVersions = [...r.versions];
                    newVersions[r.activeVersionIndex] = { ...newVersions[r.activeVersionIndex], response: `Error: ${errorMessage}` };
                    return { ...r, versions: newVersions };
                }) };
            }) };
        }));
    } finally {
        setIsLoading(false);
    }
  };

  const handleFeedback = (resultId: string, feedback: 'upvoted' | 'downvoted') => {
    updateActiveTabData({
      results: activeTab.results.map(r => r.id === resultId ? { ...r, feedback: r.feedback === feedback ? undefined : feedback } : r)
    });
  };
  
  const handleUsePrompt = (prompt: string) => {
    setCurrentPrompt(prompt);
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  
  const handleNavigateVersion = (resultId: string, direction: 'next' | 'prev') => {
     updateActiveTabData({
      results: activeTab.results.map(r => {
        if (r.id === resultId) {
          const newIndex = direction === 'next' ? r.activeVersionIndex + 1 : r.activeVersionIndex - 1;
          if (newIndex >= 0 && newIndex < r.versions.length) {
            return { ...r, activeVersionIndex: newIndex };
          }
        }
        return r;
      })
    });
  };

  const handleAddProfile = (profile: Profile) => {
    setProfiles(prev => [...prev, profile]);
    addNotification({ type: 'success', title: 'Profile Created', message: `"${profile.name}" has been added.` });
  };
  const handleUpdateProfile = (profile: Profile) => {
    setProfiles(prev => prev.map(p => p.id === profile.id ? profile : p));
     addNotification({ type: 'info', title: 'Profile Updated', message: `"${profile.name}" has been updated.` });
  };
  const handleDeleteProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if(window.confirm(`Are you sure you want to delete the profile "${profile?.name}"?`)){
        setProfiles(prev => prev.filter(p => p.id !== profileId));
    }
  };
  const handleCloneProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
        const newProfile = { ...profile, id: `profile_${Date.now()}`, name: `${profile.name} (Copy)` };
        setProfiles(prev => [...prev, newProfile]);
        addNotification({ type: 'success', title: 'Profile Cloned', message: `Created a copy of "${profile.name}".` });
    }
  };
   const handleSelectProfile = (profileId: string | null) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, project => ({ ...project, activeProfileId: profileId }));

    const profile = profiles.find(p => p.id === profileId);
    if(profile) {
        updateActiveTabData({
            selectedMode: profile.defaultMode,
            selectedFocuses: profile.defaultFocuses,
            isWebSearchEnabled: profile.defaultIsWebSearchEnabled,
            isPredictiveTextEnabled: profile.defaultIsPredictiveTextEnabled,
            writingStyle: profile.defaultWritingStyle,
        });
        if (profile.defaultInterfaceSettings) {
            setInterfaceSettings(prev => ({...prev, ...profile.defaultInterfaceSettings}));
        }
    }
  };

   const handleAddTemplate = (template: DocumentTemplate) => {
    setDocumentTemplates(prev => [...prev, template]);
    addNotification({ type: 'success', title: 'Template Created', message: `"${template.name}" has been added.` });
  };
  const handleUpdateTemplate = (template: DocumentTemplate) => {
    setDocumentTemplates(prev => prev.map(t => t.id === template.id ? template : t));
    addNotification({ type: 'info', title: 'Template Updated', message: `"${template.name}" has been updated.` });
  };
  const handleDeleteTemplate = (templateId: string) => {
    const template = documentTemplates.find(t => t.id === templateId);
    if(window.confirm(`Are you sure you want to delete the template "${template?.name}"?`)){
        setDocumentTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  const handleExportData = () => {
    const data = {
        projects,
        profiles,
        documentTemplates,
        activeProjectId
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `muse-engine-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification({ type: 'success', title: 'Data Exported', message: 'Your data has been downloaded as a JSON file.' });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Importing data will overwrite all your current projects. Are you sure you want to continue?")) {
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target?.result as string);
            if (data.projects && data.profiles && data.activeProjectId) {
                setProjects(data.projects);
                setProfiles(data.profiles);
                setDocumentTemplates(data.documentTemplates || DEFAULT_TEMPLATES);
                setActiveProjectId(data.activeProjectId);
                addNotification({ type: 'success', title: 'Import Successful', message: 'Your data has been restored from the backup.' });
            } else {
                throw new Error("Invalid file format.");
            }
        } catch (err) {
            addNotification({ type: 'error', title: 'Import Failed', message: err instanceof Error ? err.message : 'Could not read the backup file.' });
        } finally {
             event.target.value = '';
        }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    if (window.confirm("Are you sure you want to delete ALL your data? This action cannot be undone.")) {
        const newProject = createNewProject();
        setProjects([newProject]);
        setProfiles(DEFAULT_PROFILES);
        setDocumentTemplates(DEFAULT_TEMPLATES);
        setActiveProjectId(newProject.id);
        addNotification({ type: 'info', title: 'Data Cleared', message: 'All your projects and settings have been reset.' });
    }
  };


  const mainContent = () => {
    if (isNexusActive) {
        return <NexusView userPrompt={nexusPrompt} onClose={() => { setIsNexusActive(false); updateActiveTabData({ selectedMode: Mode.MUSE }); }} />;
    }

    const filteredResults = activeTab.results.filter(r =>
      activeTab.searchTerm ? r.prompt.toLowerCase().includes(activeTab.searchTerm.toLowerCase()) : true
    );
    const resultsFeedProps = {
        results: filteredResults, 
        isLoading: isLoading, 
        onClarify: handleClarify,
        onGenerateAction: handleGenerateAction,
        onFeedback: handleFeedback,
        onSavePrompt: handleSavePrompt,
        onRedoGeneration: handleRedoGeneration,
        onUsePrompt: handleUsePrompt,
        onNavigateVersion: handleNavigateVersion,
        isSearching: !!activeTab.searchTerm && filteredResults.length === 0,
        onAgentControl: handleAgentControl,
        onAgentUserInput: handleAgentUserInput,
    };

    switch (activeTab.selectedMode) {
      case Mode.LIVE:
        return <LiveConversation focuses={activeTab.selectedFocuses} tabs={activeProject.tabs} currentTabId={activeTab.id} />;
      case Mode.VISION:
        return <ScreenView />;
      default:
        return (
            <div className="flex-1 overflow-y-auto main-padding">
              <ResultsFeed {...resultsFeedProps} />
            </div>
        );
    }
  };
  
  const showDefaultLayout = activeTab.selectedMode !== Mode.LIVE && activeTab.selectedMode !== Mode.VISION && !isNexusActive;
  
  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)]">
      {isTourActive && <OnboardingTour onComplete={handleTourComplete} />}
      <Header
        onClear={() => { if(window.confirm('Are you sure you want to clear this session?')) updateActiveTabData({ results: [] }); }}
        searchTerm={activeTab.searchTerm}
        onSearchChange={(term) => updateActiveTabData({ searchTerm: term })}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onAddProject={handleAddProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        onReorderProjects={handleReorderProjects}
        tabs={activeProject.tabs}
        activeTabId={activeProject.activeTabId}
        onSelectTab={handleSelectTab}
        onAddTab={handleAddTab}
        onCloseTab={handleCloseTab}
        onRenameTab={handleRenameTab}
        onDuplicateTab={handleDuplicateTab}
        onReorderTabs={handleReorderTabs}
        saveStatus={saveStatus}
        onToggleMenu={() => setIsMenuOpen(prev => !prev)}
        currentUser={currentUser}
        onSignInClick={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        selectedMode={activeTab.selectedMode}
        onSelectMode={(mode) => updateActiveTabData({ selectedMode: mode })}
        selectedFocuses={activeTab.selectedFocuses}
        onSelectFocuses={(focuses) => updateActiveTabData({ selectedFocuses: focuses })}
        isWebSearchEnabled={activeTab.isWebSearchEnabled}
        onWebSearchChange={(enabled) => updateActiveTabData({ isWebSearchEnabled: enabled })}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
            {(showDefaultLayout) && (
            <div className="hidden md:flex h-full">
                <HistorySidebar 
                    results={activeTab.results}
                    onItemClick={(resultId) => document.getElementById(`result-${resultId}`)?.scrollIntoView({ behavior: 'smooth' })}
                    onClear={() => { if(window.confirm('Are you sure you want to clear this session?')) updateActiveTabData({ results: [] }); }}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
                    width={sidebarWidth}
                    onResize={setSidebarWidth}
                />
            </div>
            )}
            {isMobileSidebarOpen && !isNexusActive && (
                <div className="md:hidden absolute top-0 left-0 h-full z-30 bg-black/50 w-full" onClick={() => setIsMobileSidebarOpen(false)}>
                    <div onClick={e => e.stopPropagation()}>
                        <HistorySidebar 
                            results={activeTab.results}
                            onItemClick={(resultId) => {
                                document.getElementById(`result-${resultId}`)?.scrollIntoView({ behavior: 'smooth' });
                                setIsMobileSidebarOpen(false);
                            }}
                            onClear={() => { if(window.confirm('Are you sure you want to clear this session?')) updateActiveTabData({ results: [] }); }}
                            isCollapsed={false}
                            onToggleCollapse={() => setIsMobileSidebarOpen(false)}
                            width={sidebarWidth}
                            onResize={() => {}}
                            isMobile
                        />
                    </div>
                </div>
            )}
            <div className="flex-1 flex flex-col overflow-hidden">
            {mainContent()}
            {showDefaultLayout && (
                <InputController
                ref={textareaRef}
                prompt={currentPrompt}
                onPromptChange={setCurrentPrompt}
                onGenerate={(prompt, files) => handleGenerate(prompt, files, activeTab.selectedMode, activeTab.selectedFocuses)}
                isLoading={isLoading}
                savedPrompts={activeProject.savedPrompts || []}
                onDeleteSavedPrompt={handleDeleteSavedPrompt}
                isPredictiveTextEnabled={activeTab.isPredictiveTextEnabled}
                onPredictiveTextChange={(enabled) => updateActiveTabData({ isPredictiveTextEnabled: enabled })}
                writingStyle={activeTab.writingStyle}
                onWritingStyleChange={(style) => updateActiveTabData({ writingStyle: style })}
                onOpenDocumentEditor={() => setIsDocumentEditorOpen(true)}
                chatHistory={chatHistoryForPrediction}
                />
            )}
            </div>
        </div>
        {showDefaultLayout && <Footer onNavigate={setPage} />}
      </main>
      
      {modalState && (
        <CustomPromptModal 
            isOpen={modalState.isOpen}
            title={modalState.title}
            label={modalState.label}
            initialValue={modalState.initialValue}
            onConfirm={modalState.onConfirm}
            onCancel={() => setModalState(null)}
        />
      )}
      <Menu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentTheme={theme}
        onThemeChange={setTheme}
        currentAppearance={appearance}
        onAppearanceChange={setAppearance}
        storagePreference={storagePreference}
        onStoragePreferenceChange={setStoragePreference}
        interfaceSettings={interfaceSettings}
        onInterfaceSettingsChange={setInterfaceSettings}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onClearAllData={handleClearAllData}
        currentUser={currentUser}
        profiles={profiles}
        onAddProfile={handleAddProfile}
        onUpdateProfile={handleUpdateProfile}
        onDeleteProfile={handleDeleteProfile}
        onCloneProfile={handleCloneProfile}
        documentTemplates={documentTemplates}
        onAddTemplate={handleAddTemplate}
        onUpdateTemplate={handleUpdateTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
       <DocumentEditorModal
        isOpen={isDocumentEditorOpen}
        onClose={() => setIsDocumentEditorOpen(false)}
        content={activeTab.documentContent}
        onContentChange={handleDocumentContentChange}
        settings={activeTab.documentSettings}
        onSettingsChange={handleDocumentSettingsChange}
        chatHistory={chatHistoryForPrediction}
        chatFocuses={activeTab.selectedFocuses}
        documentTemplates={documentTemplates}
      />
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />
      <SignUpSuggestionModal
        isOpen={isSignUpSuggestionOpen}
        onClose={() => setIsSignUpSuggestionOpen(false)}
        onCreateAccount={() => {
            setIsSignUpSuggestionOpen(false);
            setIsAuthModalOpen(true);
        }}
      />
    </div>
  );
};

export default App;
