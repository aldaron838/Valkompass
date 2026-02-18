import React, { useState, useEffect, useRef } from 'react';
import { Question, Answer } from '../types';
import { Button } from './Button';
import { Info, ArrowRight, ArrowLeft, Star, ExternalLink, MessageSquare, PenLine, X, PauseCircle, FastForward } from 'lucide-react';

interface QuizProps {
  questions: Question[];
  totalCount?: number; 
  onComplete: (answers: Answer[]) => void;
}

const AUTO_ADVANCE_DELAY = 5500; // ms - Increased delay for better UX

export const Quiz: React.FC<QuizProps> = ({ questions, totalCount, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [isImportant, setIsImportant] = useState<boolean>(false);
  const [comment, setComment] = useState<string>("");
  
  // UX States
  const [isNuancing, setIsNuancing] = useState<boolean>(false); 
  const [isAutoAdvancing, setIsAutoAdvancing] = useState<boolean>(false);

  const currentQuestion = questions[currentIndex];
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const finalCount = totalCount || questions.length;
  const progress = ((currentIndex) / finalCount) * 100;

  const PHASE_SIZE = 10;
  const currentPhase = Math.floor(currentIndex / PHASE_SIZE) + 1;
  const totalPhases = Math.ceil(finalCount / PHASE_SIZE);
  
  // Reset state on new question
  useEffect(() => {
    // Clear any pending timers from previous question
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    setIsAutoAdvancing(false);

    const existing = answers.find(a => a.questionId === currentQuestion?.id);
    if (existing) {
      setSelectedValue(existing.value);
      setIsImportant(existing.isImportant);
      setComment(existing.comment || "");
      // If there was a comment, open the box and don't auto-advance
      setIsNuancing(!!existing.comment && existing.comment.length > 0);
    } else {
      setSelectedValue(null);
      setIsImportant(false);
      setComment("");
      setIsNuancing(false);
    }
  }, [currentIndex, currentQuestion, answers]);

  // Focus input when opening nuance
  useEffect(() => {
    if (isNuancing && commentInputRef.current) {
        commentInputRef.current.focus();
    }
  }, [isNuancing]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  const saveAnswer = (value: number) => {
    const newAnswers = [...answers];
    const existingIndex = newAnswers.findIndex(a => a.questionId === currentQuestion.id);
    
    const answerObject: Answer = { 
      questionId: currentQuestion.id, 
      value: value,
      isImportant: isImportant,
      comment: comment.trim() !== "" ? comment : undefined
    };

    if (existingIndex >= 0) {
      newAnswers[existingIndex] = answerObject;
    } else {
      newAnswers.push(answerObject);
    }
    setAnswers(newAnswers);
    return newAnswers;
  };

  const goToNext = (value: number) => {
    const finalAnswers = saveAnswer(value);
    
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (questions.length < finalCount) {
      onComplete(finalAnswers);
    } else {
      onComplete(finalAnswers);
    }
  };

  const handleNextClick = () => {
    if (selectedValue === null) return;
    goToNext(selectedValue);
  };

  const handleBack = () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Feature 3 & UX Fix: The "Grace Period" Logic
  const handleSelection = (value: number) => {
    setSelectedValue(value);
    
    // If we are already editing a comment, DO NOT auto-advance.
    if (isNuancing) {
        return;
    }

    // Start the visual countdown
    setIsAutoAdvancing(true);

    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

    autoAdvanceTimerRef.current = setTimeout(() => {
        goToNext(value);
    }, AUTO_ADVANCE_DELAY);
  };

  const stopAutoAdvance = () => {
    if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
    }
    setIsAutoAdvancing(false);
    setIsNuancing(true); // Open the comment box immediately
  };

  const OptionButton = ({ value, label, colorClass, isNeutral = false }: { value: number, label: string, colorClass: string, isNeutral?: boolean }) => (
    <button
      onClick={() => handleSelection(value)}
      className={`
        flex-1 py-3 px-2 rounded-lg border-2 transition-all duration-200 text-sm md:text-base font-medium flex flex-col items-center justify-center min-h-[80px]
        dark:bg-gray-800 dark:border-gray-700 relative overflow-hidden group
        ${selectedValue === value 
          ? `bg-gray-800 text-white border-gray-800 scale-105 shadow-lg dark:bg-blue-600 dark:border-blue-500` 
          : `bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700`
        }
        ${isAutoAdvancing && selectedValue !== value ? 'opacity-50 grayscale' : ''}
      `}
    >
      <div className={`mb-2 w-full h-1.5 rounded-full ${colorClass} opacity-80 max-w-[40px]`}></div>
      <span className="text-center leading-tight z-10">{label}</span>
    </button>
  );

  if (!currentQuestion) return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 animate-pulse">Laddar nästa uppsättning frågor...</p>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Bar & Phase Indicator */}
      <div className="mb-6">
        <div className="flex justify-between items-end text-gray-500 dark:text-gray-400 mb-2">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
               Etapp {currentPhase}/{totalPhases}
            </span>
            <span className="text-xs uppercase tracking-wide font-semibold">Fråga {currentIndex + 1} av {finalCount}</span>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase">{currentQuestion.category}</span>
        </div>
        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 min-h-[600px] flex flex-col relative overflow-hidden transition-colors duration-300">
        
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-tight relative z-10">
          {currentQuestion.text}
        </h2>

        {/* Context Box */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg relative z-10">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed mb-2">
                {currentQuestion.explanation}
              </p>
              {currentQuestion.searchQuery && (
                 <a 
                   href={`https://www.google.com/search?q=${encodeURIComponent(currentQuestion.searchQuery)}`}
                   target="_blank"
                   rel="noreferrer"
                   className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                 >
                   Läs mer om ämnet <ExternalLink className="w-3 h-3 ml-1" />
                 </a>
              )}
            </div>
          </div>
        </div>

        {/* Importance Toggle */}
        <div className="mb-6 flex items-center justify-center relative z-10">
          <button 
            onClick={() => setIsImportant(!isImportant)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200
              ${isImportant 
                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-600' 
                : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }
            `}
          >
            <Star className={`w-4 h-4 ${isImportant ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
            {isImportant ? 'Markerad som extra viktig' : 'Markera som extra viktig'}
          </button>
        </div>

        {/* Options */}
        <div className="mt-auto space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <OptionButton value={1} label="Nej, absolut inte" colorClass="bg-red-600" />
            <OptionButton value={2} label="Nej, knappast" colorClass="bg-red-400" />
            <OptionButton value={3} label="Kanske / Neutral" colorClass="bg-gray-400" isNeutral />
            <OptionButton value={4} label="Ja, delvis" colorClass="bg-green-400" />
            <OptionButton value={5} label="Ja, absolut" colorClass="bg-green-600" />
          </div>
          
          <button
            onClick={() => handleSelection(0)}
            className={`
               w-full py-2 rounded-lg border border-dashed text-sm font-medium transition-colors
               ${selectedValue === 0 
                 ? 'bg-gray-200 border-gray-400 text-gray-800 dark:bg-gray-600 dark:text-white' 
                 : 'border-gray-300 text-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
               }
            `}
          >
            Jag har ingen åsikt / Vet ej
          </button>

          {/* AUTO-ADVANCE GRACE PERIOD UI */}
          {isAutoAdvancing && (
             <div className="animate-fade-in-up mt-4">
                <button 
                    onClick={stopAutoAdvance}
                    className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between group hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm text-blue-600">
                             <PauseCircle className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-blue-900 dark:text-white text-sm">Pausad för eftertanke...</p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">Klicka här för att skriva en motivering</p>
                        </div>
                    </div>
                    <div className="text-xs font-bold bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-blue-600 shadow-sm group-hover:scale-105 transition-transform">
                        Stoppa
                    </div>
                </button>
                {/* Visual Progress Bar for Auto Advance */}
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-2 overflow-hidden relative">
                    <div 
                        className="h-full bg-blue-500 rounded-full absolute top-0 left-0" 
                        style={{ 
                            width: '100%',
                            transition: `width ${AUTO_ADVANCE_DELAY}ms linear` 
                        }}
                        ref={(el) => {
                            if (el) {
                                el.style.width = '0%';
                                requestAnimationFrame(() => {
                                    el.style.width = '100%';
                                });
                            }
                        }}
                    ></div>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2 animate-pulse">
                   Går vidare automatiskt... Klicka på <b>Nästa</b> för att hoppa över.
                </p>
             </div>
          )}

          {/* Comment Section (Visible if nuancing OR explicitly toggled) */}
          {(!isAutoAdvancing && isNuancing) && (
             <div className="mt-2 animate-fade-in-up">
                <div className="flex justify-between items-center mb-1 px-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Din motivering</label>
                    <button onClick={() => setIsNuancing(false)} className="text-gray-400 hover:text-red-500 p-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="relative">
                    <div className="absolute top-3 left-3 text-gray-400">
                    <MessageSquare className="w-4 h-4" />
                    </div>
                    <textarea
                    ref={commentInputRef}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Förklara hur du tänker..."
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border-2 border-blue-100 focus:border-blue-500 focus:ring-0 outline-none resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-500 transition-colors"
                    rows={2}
                    />
                </div>
             </div>
          )}
          
          {/* Default "Start Nuance" button (Only visible if NOT auto-advancing and NOT already nuancing) */}
          {(!isAutoAdvancing && !isNuancing && selectedValue === null) && (
              <div className="h-6"></div> // Spacer to keep layout stable
          )}

          <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-6 mt-4">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={currentIndex === 0}
              className="text-sm px-4 dark:text-gray-300 dark:border-gray-600 dark:hover:border-blue-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Tillbaka
            </Button>
            
            <Button 
              onClick={handleNextClick} 
              disabled={selectedValue === null}
              className={`${isAutoAdvancing ? 'w-auto px-6 bg-blue-700 hover:bg-blue-800 scale-105' : 'w-32'} transition-all duration-300`}
            >
              {isAutoAdvancing ? 'Gå vidare direkt' : (currentIndex === finalCount - 1 ? 'Se Resultat' : 'Nästa')} 
              {isAutoAdvancing ? <FastForward className="w-4 h-4 ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};