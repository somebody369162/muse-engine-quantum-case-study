

export enum Mode {
  MUSE = 'Muse',
  CHAT = 'Chat',
  QUICK = 'Quick',
  THINKER = 'Thinker',
  LIVE = 'Live',
  PROFESSOR = 'Professor',
  VISION = 'Vision',
  AGENT = 'Agent',
  NEXUS = 'Nexus', // Experimental Mode
}

export enum Focus {
  CREATIVE = 'Creative',
  TECHNICAL = 'Technical',
  CODE = 'Code',
  SYMBOLIC = 'Symbolic',
  WORD_FINDER = 'Word Finder',
  REAL_ESTATE = 'Real Estate',
  LEGAL = 'Legal',
  MEDICAL = 'Medical',
  PSYCHOLOGY = 'Psychology',
  RESEARCH = 'Research',
  SCIENTIFIC = 'Scientific',
  CYBERSECURITY = 'Cybersecurity',
  PENETRATION_TESTING = 'Penetration Testing',
  DEVELOPER = 'Developer',
  POLITICS = 'Politics',
  BUSINESS = 'Business',
  ETHICS = 'Ethics',
}

export interface VisionResult {
  id: string;
  imageDataUrl: string;
  prompt: string;
  response: string;
  isLoading: boolean;
}


export type IconName = 'muse' | 'chat' | 'thinker' | 'quick' | 'send' | 'sparkles' | 'lightbulb' | 'trash' | 'search' | 'microphone' | 'thumb-up' | 'thumb-down' | 'speak' | 'wave' | 'user' | 'copy' | 'check' | 'agent' | 'plus' | 'close' | 'folder' | 'chevron-down' | 'edit' | 'dots-horizontal' | 'folder-open' | 'save' | 'play' | 'pause' | 'stop' | 'gemini' | 'bookmark' | 'menu' | 'cog' | 'question-mark-circle' | 'arrow-up-on-square' | 'arrow-down-on-square' | 'sync' | 'refresh' | 'chevron-left' | 'chevron-right' | 'book-open' | 'speaker-wave' | 'microphone-slash' | 'briefcase' | 'palette' | 'paperclip' | 'eye' | 'test-tube' | 'code' | 'camera' | 'pause-circle' | 'play-circle' | 'template' | 'document-text' | 'bold' | 'italic' | 'list-bullet' | 'h1' | 'h2' | 'download' | 'wand' | 'cpu' | 'globe' | 'scale' | 'chart-bar' | 'cube-transparent';

export interface Profile {
  id: string;
  name: string;
  icon: IconName;
  defaultMode: Mode;
  defaultFocuses: Focus[];
  defaultIsWebSearchEnabled: boolean;
  defaultIsPredictiveTextEnabled: boolean;
  defaultWritingStyle: string;
  defaultInterfaceSettings?: Partial<InterfaceSettings>;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  icon: IconName;
}

export type Appearance = 'vanta' | 'legacy' | 'serene' | 'arcade' | 'solar' | 'oceanic' | 'celestial';
export type StoragePreference = 'local' | 'cloud' | 'both';

export type UIDensity = 'comfortable' | 'compact';
export type AnimationLevel = 'full' | 'minimal';
export type FontSize = 'small' | 'medium' | 'large';

export interface InterfaceSettings {
  density: UIDensity;
  animations: AnimationLevel;
  fontSize: FontSize;
  soundEffects: boolean;
  showExperimentalModes?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Citation {
  uri: string;
  title: string;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'completed' | 'in-progress' | 'awaiting-input' | 'error' | 'idle';
  inputPrompt?: string;
  result?: string;
  citations?: Citation[];
}

export interface AgentState {
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'error' | 'completed';
  currentStepIndex?: number;
}

export interface ResponseVersion {
  response: string;
  citations: Citation[];
  timestamp: string;
}

export interface Result {
  id: string;
  mode: Mode;
  focuses?: Focus[];
  prompt: string;
  
  versions: ResponseVersion[];
  activeVersionIndex: number;

  feedback?: 'upvoted' | 'downvoted';
  
  agentState?: AgentState;
  plan?: PlanStep[];
}

export interface DocumentSettings {
  isPredictiveTextEnabled: boolean;
  useCustomFocuses: boolean;
  focuses: Focus[];
  writingStyle: string;
}

export interface CodeSandboxSettings {
  template: 'html' | 'jsx';
}

export interface Tab {
  id: string;
  name: string;
  results: Result[];
  selectedMode: Mode;
  selectedFocuses: Focus[];
  searchTerm: string;
  isWebSearchEnabled: boolean;
  isPredictiveTextEnabled: boolean;
  writingStyle: string;
  documentContent: string;
  documentSettings: DocumentSettings;
  sessionSummary?: string;
}

export interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
  mode: Mode;
  focuses: Focus[];
  isWebSearchEnabled?: boolean;
}

export interface Project {
  id: string;
  name: string;
  tabs: Tab[];
  activeTabId: string;
  savedPrompts?: SavedPrompt[];
  activeProfileId?: string | null;
}
