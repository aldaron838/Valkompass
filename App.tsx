import React, { useState, useEffect, useRef } from 'react';
import { AppState, Question, Answer, AnalysisResult, SavedSession } from './types';
import { generateQuestions, analyzeResults } from './services/geminiService';
import { Quiz } from './components/Quiz';
import { Results } from './components/Results';
import { Button } from './components/Button';
import { Sparkles, CheckCircle2, Moon, Sun, Trash2, Brain, MessageCircle, Users, History, BarChart3, ArrowRight, Globe } from 'lucide-react';

const SESSION_KEY = 'valkompass_session_v3'; // Version bump
const THEME_KEY = 'valkompass_theme';
const TARGET_QUESTIONS = 50; // Increased to 50 for accuracy

export default function App() {
  const [state, setState] = useState<AppState>(AppState.INTRO);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // Track the current "run" to avoid race conditions with background fetching
  const currentSessionId = useRef<number>(0);

  // Load Session and Theme
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
    }

    // Session
    const savedSessionStr = localStorage.getItem(SESSION_KEY);
    if (savedSessionStr) {
      try {
        const saved: SavedSession = JSON.parse(savedSessionStr);
        if (Date.now() - saved.lastUpdated < 1000 * 60 * 60 * 24) {
          setQuestions(saved.questions);
          setAnswers(saved.answers);
          setResult(saved.result);
          setState(saved.state);
        }
      } catch (e) {
        console.error("Failed to restore session", e);
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  // Save Session & Theme Effects
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (state !== AppState.INTRO && state !== AppState.ERROR) {
      const session: SavedSession = {
        state,
        questions,
        answers,
        result,
        lastUpdated: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }, [state, questions, answers, result]);

  // Feature 4: Streaming-like loading (Upgraded for 50 questions)
  const startQuiz = async () => {
    const sessionId = Date.now();
    currentSessionId.current = sessionId;

    setState(AppState.LOADING_QUESTIONS);
    setError(null);
    setQuestions([]); // Clear existing
    
    try {
      // 1. Fetch initial batch (5 questions) to start quickly
      const initialQuestions = await generateQuestions(5, 1, []);
      
      // Check if this session is still active
      if (currentSessionId.current !== sessionId) return;

      setQuestions(initialQuestions);
      setState(AppState.QUIZ);

      // 2. Fetch remaining batches in background to reach 50
      (async () => {
         // Keep a local copy of all questions generated so far in this session
         // so we can pass them to the generator to avoid duplicates.
         let currentTotalQuestions = [...initialQuestions];

         const batches = [
            { count: 15, start: 6 },
            { count: 15, start: 21 },
            { count: 15, start: 36 }
         ];

         for (const batch of batches) {
            if (currentSessionId.current !== sessionId) break;
            try {
               // Pass 'currentTotalQuestions' to ensure new questions are unique
               const newQs = await generateQuestions(batch.count, batch.start, currentTotalQuestions);
               
               if (currentSessionId.current !== sessionId) break;
               
               // De-dupe logic (just in case)
               const existingIds = new Set(currentTotalQuestions.map(q => q.id));
               const uniqueNew = newQs.filter(q => !existingIds.has(q.id));
               
               // Update local accumulator
               currentTotalQuestions = [...currentTotalQuestions, ...uniqueNew];

               // Update state
               setQuestions(prev => {
                  const prevIds = new Set(prev.map(q => q.id));
                  const validNew = uniqueNew.filter(q => !prevIds.has(q.id));
                  return [...prev, ...validNew];
               });

            } catch (bgError) {
               console.error(`Background batch failed for startId ${batch.start}`, bgError);
               break; 
            }
         }
      })();

    } catch (err) {
      if (currentSessionId.current !== sessionId) return;
      console.error(err);
      setError("Kunde inte generera frågor. Kontrollera din anslutning eller försök igen.");
      setState(AppState.ERROR);
    }
  };

  const handleQuizComplete = async (userAnswers: Answer[]) => {
    setAnswers(userAnswers);
    setState(AppState.ANALYZING);
    try {
      const analysis = await analyzeResults(questions, userAnswers);
      setResult(analysis);
      setState(AppState.RESULTS);
    } catch (err) {
      console.error(err);
      setError("Kunde inte analysera resultaten. Försök igen.");
      setState(AppState.ERROR);
    }
  };

  const restart = () => {
    if (window.confirm("Är du säker på att du vill nollställa allt?")) {
      // Invalidate any running fetches
      currentSessionId.current = 0;
      
      setQuestions([]);
      setAnswers([]);
      setResult(null);
      setState(AppState.INTRO);
      localStorage.removeItem(SESSION_KEY);
    }
  };

  const toggleTheme = () => setDarkMode(!darkMode);

  // Modern Feature Card Component
  const FeatureCard = ({ icon: Icon, title, desc, colorClass }: any) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-700 group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClass} group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm sticky top-0 z-50 transition-colors duration-300 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-default">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg shadow-lg group-hover:rotate-12 transition-transform">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">Valkompass <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 font-extrabold">2026</span></span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Växla tema"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {state !== AppState.INTRO && (
              <button onClick={restart} type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Börja om</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
        
        {/* Decorative Background Elements */}
        {state === AppState.INTRO && (
           <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-3xl dark:bg-blue-900/20"></div>
              <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-3xl dark:bg-indigo-900/20"></div>
           </div>
        )}

        {state === AppState.INTRO && (
          <div className="max-w-6xl w-full mx-auto relative z-10 animate-fade-in flex flex-col items-center">
            
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto mb-16 pt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
                <Brain className="w-3 h-3" />
                Driven av Gemini AI
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6 leading-tight">
                Politik på <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">dina villkor</span>.
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
                Glöm statiska formulär. Vår AI genererar frågor baserat på <span className="font-semibold text-gray-900 dark:text-white">dagens nyhetsflöde</span>, förstår dina nyanserade svar och utmanar din världsbild i realtid.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button onClick={startQuiz} className="w-full sm:w-auto text-lg px-8 py-4 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow">
                  Starta Analysen
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                {questions.length > 0 && (
                   <div className="flex items-center gap-4 animate-fade-in ml-0 sm:ml-4 mt-4 sm:mt-0">
                      <span className="text-gray-400 dark:text-gray-600 hidden sm:inline">|</span>
                      <button 
                        onClick={() => setState(questions.length > 0 && result ? AppState.RESULTS : AppState.QUIZ)}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                         <History className="w-5 h-5" />
                         Fortsätt session
                      </button>
                   </div>
                )}
              </div>
            </div>

            {/* Feature Grid (Bento Style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full px-2">
              <FeatureCard 
                icon={Globe} 
                colorClass="bg-blue-500"
                title="Realtids-genererade Frågor" 
                desc="Alla frågor uppdateras varje gång du gör testet, AI ser över vad som är aktuellt och dagsfärskt och anpassar frågorna efter detta." 
              />
              <FeatureCard 
                icon={MessageCircle} 
                colorClass="bg-red-500"
                title="Djävulens Advokat" 
                desc="Vår AI nöjer sig inte med ett svar. I slutet utmanar den din starkaste åsikt i en interaktiv chatt." 
              />
              <FeatureCard 
                icon={Users} 
                colorClass="bg-green-600"
                title="Regeringsbyggaren" 
                desc="Vi räknar inte bara partier. Vi bygger realistiska regeringsunderlag som matchar din profil." 
              />
              <FeatureCard 
                icon={BarChart3} 
                colorClass="bg-purple-500"
                title="GAL-TAN & Vänster-Höger" 
                desc="Få din position utplacerad på den klassiska politiska skalan, tillsammans med alla partier." 
              />
              <FeatureCard 
                icon={Brain} 
                colorClass="bg-indigo-500"
                title="Vi förstår nyanser" 
                desc="Skriv en motivering till ditt svar. AI:n läser den och justerar resultatet efter din unika åsikt." 
              />
              <FeatureCard 
                icon={History} 
                colorClass="bg-amber-500"
                title="Historisk Tidsresa" 
                desc="Politik förändras. Jämför ditt matchande partis åsikter idag med vad de tyckte på 90-talet." 
              />
            </div>

          </div>
        )}

        {state === AppState.LOADING_QUESTIONS && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Genererar valkompass...</h2>
            <p className="text-gray-500 dark:text-gray-400">AI söker efter aktuella politiska debattämnen</p>
          </div>
        )}

        {state === AppState.QUIZ && (
          <Quiz 
            questions={questions} 
            totalCount={TARGET_QUESTIONS} 
            onComplete={handleQuizComplete} 
          />
        )}

        {state === AppState.ANALYZING && (
          <div className="text-center space-y-6 max-w-md">
            <div className="relative">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full animate-ping absolute inset-0 m-auto"></div>
              <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full relative z-10 flex items-center justify-center mx-auto shadow-md">
                <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analyserar din profil</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Jämför dina svar, bygger regeringar och ritar kartor...</p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
               <div className="h-full bg-blue-600 animate-progress w-full origin-left"></div>
            </div>
            <style>{`
              @keyframes progress {
                0% { transform: scaleX(0); }
                100% { transform: scaleX(1); }
              }
              .animate-progress {
                animation: progress 3s ease-in-out infinite;
              }
            `}</style>
          </div>
        )}

        {state === AppState.RESULTS && result && (
          <Results result={result} onRestart={restart} />
        )}

        {state === AppState.ERROR && (
          <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md transition-colors">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ett fel uppstod</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Button onClick={restart} variant="outline" className="dark:text-white dark:border-gray-600">Gå tillbaka till start</Button>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-gray-400 dark:text-gray-600 text-sm transition-colors border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 relative z-10">
        <p>&copy; 2026 Valkompass. AI-genererat innehåll kan variera.</p>
      </footer>
    </div>
  );
}