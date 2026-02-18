import React, { useState, useEffect, useRef } from 'react';
import { DevilAdvocate } from '../types';
import { chatWithDevil } from '../services/geminiService';
import { Send, Flame, User, Bot } from 'lucide-react';

interface DevilAdvocateChatProps {
  initialContext: DevilAdvocate;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const DevilAdvocateChat: React.FC<DevilAdvocateChatProps> = ({ initialContext }) => {
  // Initialize chat with the generated counter-argument
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: initialContext.counterArgument }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: input };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await chatWithDevil(newHistory, initialContext);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Chat failed", error);
      // Simple error handling in chat
      setMessages(prev => [...prev, { role: 'model', text: "Jag tappade tråden lite... kan du formulera om det?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-gray-800 p-0 rounded-2xl shadow-lg border border-red-100 dark:border-red-900/50 overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="bg-red-100/50 dark:bg-red-900/30 p-4 border-b border-red-100 dark:border-red-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold leading-none">Djävulens Advokat</h3>
            <span className="text-xs opacity-75 font-medium">Utmana din filterbubbla</span>
          </div>
        </div>
        <div className="hidden md:block text-xs text-red-600/70 dark:text-red-300/50 max-w-[200px] text-right leading-tight">
          Ämne: {initialContext.questionText.substring(0, 30)}...
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/50 dark:bg-gray-800/50">
        <div className="text-center mb-4">
             <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-3 py-1 rounded-full">
                Du tyckte: "{initialContext.userStance}"
             </span>
        </div>

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div 
                className={`
                    max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-600 rounded-tl-none'
                    }
                `}
            >
                {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-red-600 dark:text-red-300" />
                </div>
                <div className="bg-white dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-600 flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
        <div className="flex gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Skriv ditt motargument..."
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white px-4 rounded-xl transition-colors flex items-center justify-center shadow-md"
            >
                <Send className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};
