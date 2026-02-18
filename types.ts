
export interface Question {
  id: number;
  text: string;
  explanation: string;
  category: string;
  searchQuery: string;
}

export interface Answer {
  questionId: number;
  value: number; // 0 (Vet ej), 1-5
  isImportant: boolean;
  comment?: string; // Feature 7: Free text input
}

export interface PartyMatch {
  party: string;
  score: number;
  reason: string;
  // Feature 4: Explanatory comparison
  strongestAgreements: string[]; // List of topics/questions where user and party align
  strongestDisagreements: string[]; // List of topics/questions where they differ
}

export interface CategoryScore {
  category: string;
  score: number;
  description: string;
}

// Feature 1: GAL-TAN
export interface Coordinates {
  x: number; // -100 (Left) to 100 (Right)
  y: number; // -100 (GAL) to 100 (TAN)
}

export interface PartyPosition {
  partyId: string;
  x: number;
  y: number;
}

// Feature 2: Coalition Builder
export interface Coalition {
  parties: string[]; // List of party IDs
  totalMatch: number; // Average match score
  description: string;
}

// Feature 5: Devil's Advocate
export interface DevilAdvocate {
  questionText: string;
  userStance: string;
  counterArgument: string;
}

// Feature 9: Historical Context
export interface HistoricalContext {
  topic: string;
  comparison: string; // How matched party changed over 30 years
}

export interface AnalysisResult {
  summary: string;
  matches: PartyMatch[];
  categoryScores: CategoryScore[];
  coordinates: Coordinates;
  partyPositions: PartyPosition[]; // New field for visualizing parties
  coalitions: Coalition[];
  devilAdvocate: DevilAdvocate;
  historicalContext: HistoricalContext;
}

export enum AppState {
  INTRO = 'INTRO',
  LOADING_QUESTIONS = 'LOADING_QUESTIONS',
  QUIZ = 'QUIZ',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}

export interface SavedSession {
  state: AppState;
  questions: Question[];
  answers: Answer[];
  result: AnalysisResult | null;
  lastUpdated: number;
}

export const PARTIES = [
  { id: 'v', name: 'Vänsterpartiet', color: '#da291c', short: 'V' },
  { id: 's', name: 'Socialdemokraterna', color: '#ed1b34', short: 'S' },
  { id: 'mp', name: 'Miljöpartiet', color: '#53a045', short: 'MP' },
  { id: 'c', name: 'Centerpartiet', color: '#009933', short: 'C' },
  { id: 'l', name: 'Liberalerna', color: '#006ab3', short: 'L' },
  { id: 'm', name: 'Moderaterna', color: '#52bdec', short: 'M' },
  { id: 'kd', name: 'Kristdemokraterna', color: '#005ea1', short: 'KD' },
  { id: 'sd', name: 'Sverigedemokraterna', color: '#dddd00', short: 'SD' },
];
