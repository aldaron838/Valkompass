import React, { useState } from 'react';
import { AnalysisResult, PARTIES } from '../types';
import { Button } from './Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine, Label, ZAxis, LabelList } from 'recharts';
import { RefreshCw, Share2, ChevronDown, ChevronUp, Users, Flame, History, Compass, CheckCircle2, XCircle } from 'lucide-react';
import { DevilAdvocateChat } from './DevilAdvocateChat';

interface ResultsProps {
  result: AnalysisResult;
  onRestart: () => void;
}

export const Results: React.FC<ResultsProps> = ({ result, onRestart }) => {
  const [expandedParty, setExpandedParty] = useState<string | null>(null);

  const chartData = result.matches
    .map(match => {
      const partyMeta = PARTIES.find(p => p.id === match.party.toLowerCase()) || { name: match.party, color: '#999', short: match.party.substring(0,2) };
      return {
        ...match,
        name: partyMeta.name,
        shortName: partyMeta.short || match.party.toUpperCase(),
        fill: partyMeta.color,
      };
    })
    .sort((a, b) => b.score - a.score);

  const topMatch = chartData[0];

  const handleShare = async () => {
    const shareData = {
      title: 'Valkompass 2026',
      text: `Jag fick ${topMatch.name} (${topMatch.score}%) i Valkompass 2026! Testa du också.`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('User cancelled share');
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert('Resultat kopierat till urklipp!');
    }
  };

  const toggleExpand = (partyId: string) => {
    setExpandedParty(expandedParty === partyId ? null : partyId);
  };

  // Prepare data for Scatter Chart (GAL-TAN)
  const userPoint = { x: result.coordinates.x, y: result.coordinates.y, name: "DU", fill: '#000000', r: 150 };
  
  const partyPoints = result.partyPositions?.map(pos => {
      const meta = PARTIES.find(p => p.id === pos.partyId.toLowerCase());
      return {
          x: pos.x,
          y: pos.y,
          name: meta?.short || pos.partyId.toUpperCase(),
          fill: meta?.color || '#999',
          r: 50
      };
  }) || [];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-12">
      
      {/* Top Match Hero */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border-t-8 transition-colors" style={{ borderColor: topMatch.fill }}>
        <div className="p-8 md:p-12 text-center">
          <h2 className="text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-sm mb-2">Ditt bästa val är</h2>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">{topMatch.name}</h1>
          <div className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full px-6 py-2 text-xl font-bold text-gray-800 dark:text-white mb-8">
            {topMatch.score}% Matchning
          </div>
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
            {result.summary}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Feature 1: GAL-TAN / Political Compass (Enhanced with Parties) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-center">
           <div className="flex items-center gap-2 mb-4 self-start">
              <Compass className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Politisk Kompass</h3>
           </div>
           <div className="h-[350px] w-full max-w-[350px] relative border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" domain={[-100, 100]} hide />
                  <YAxis type="number" dataKey="y" domain={[-100, 100]} hide />
                  <ZAxis type="number" dataKey="r" range={[60, 300]} /> {/* Scale based on importance/z */}
                  
                  <ReferenceLine y={0} stroke="#9ca3af" />
                  <ReferenceLine x={0} stroke="#9ca3af" />
                  
                  {/* Parties */}
                  <Scatter name="Partier" data={partyPoints} shape="circle">
                    {partyPoints.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
                    ))}
                    <LabelList dataKey="name" position="top" style={{ fill: '#4b5563', fontSize: '10px', fontWeight: 'bold' }} />
                  </Scatter>

                  {/* User */}
                  <Scatter name="Du" data={[userPoint]} shape="cross">
                     <Cell fill="#000" strokeWidth={3} />
                     <LabelList dataKey="name" position="bottom" style={{ fill: '#000', fontSize: '12px', fontWeight: 'bold' }} />
                  </Scatter>

                </ScatterChart>
              </ResponsiveContainer>
              {/* Text Labels for Compass */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400 bg-white/80 dark:bg-gray-900/80 px-1 rounded">GAL (Progressiv)</div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400 bg-white/80 dark:bg-gray-900/80 px-1 rounded">TAN (Konservativ)</div>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 -rotate-90 bg-white/80 dark:bg-gray-900/80 px-1 rounded">Vänster</div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 rotate-90 bg-white/80 dark:bg-gray-900/80 px-1 rounded">Höger</div>
           </div>
           <p className="text-xs text-gray-400 mt-2 text-center">Partiernas positioner är uppskattade av AI baserat på aktuellt läge.</p>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
           <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Dina åsikter per område</h3>
           <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
             {result.categoryScores?.map((cat) => (
               <div key={cat.category}>
                 <div className="flex justify-between items-end mb-1">
                   <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cat.category}</span>
                   <span className="text-xs text-gray-500 dark:text-gray-400">{cat.score > 0 ? "Höger" : "Vänster"} lutning</span>
                 </div>
                 <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative">
                   <div 
                     className="absolute h-2 rounded-full bg-blue-500 transition-all duration-1000" 
                     style={{ 
                        left: cat.score < 0 ? `${50 + (cat.score/2)}%` : '50%',
                        width: `${Math.abs(cat.score)/2}%`
                     }}
                   ></div>
                   <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 h-3 -mt-0.5"></div>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Feature 2: Coalition Builder */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg md:col-span-2">
           <div className="flex items-center gap-2 mb-4">
              <Users className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Föreslagna Regeringsunderlag</h3>
           </div>
           <div className="grid md:grid-cols-2 gap-4">
             {result.coalitions?.map((coalition, idx) => (
               <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                 <div className="flex -space-x-2 mb-3">
                   {coalition.parties.map(pId => {
                     const p = PARTIES.find(pa => pa.id === pId.toLowerCase());
                     return p ? (
                       <div key={p.id} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: p.color }}>
                         {p.short || p.id.toUpperCase()}
                       </div>
                     ) : null;
                   })}
                 </div>
                 <h4 className="font-bold text-gray-900 dark:text-white mb-1">Matchning: {coalition.totalMatch}%</h4>
                 <p className="text-sm text-gray-600 dark:text-gray-300">{coalition.description}</p>
               </div>
             ))}
           </div>
        </div>

        {/* Feature 5: Devil's Advocate CHAT (UPDATED) */}
        <div className="md:col-span-1 h-full">
            <DevilAdvocateChat initialContext={result.devilAdvocate} />
        </div>

        {/* Feature 9: Historical Context */}
        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl shadow-lg border border-amber-100 dark:border-amber-900/50">
           <div className="flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-400">
              <History className="w-6 h-6" />
              <h3 className="text-xl font-bold">Historisk Tidsresa</h3>
           </div>
           <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Ämne: {result.historicalContext.topic}</h4>
           <p className="text-gray-800 dark:text-gray-200">{result.historicalContext.comparison}</p>
        </div>

        {/* Party List Breakdown (Feature 4: Explanatory Comparison) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col md:col-span-2">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Total Matchning & Detaljer</h3>
          <div className="space-y-3">
            {chartData.map((party) => (
              <div 
                key={party.party} 
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => toggleExpand(party.party)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: party.fill }}></div>
                  <span className="font-bold text-gray-900 dark:text-white flex-1">{party.name}</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{party.score}%</span>
                  {expandedParty === party.party ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-2">
                  <div 
                    className="h-1.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${party.score}%`, backgroundColor: party.fill }}
                  ></div>
                </div>
                
                {expandedParty === party.party && (
                  <div className="mt-4 animate-fade-in border-t border-gray-200 dark:border-gray-600 pt-4 cursor-auto" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic mb-4">
                      "{party.reason}"
                    </p>
                    
                    {/* Feature 4: Explanatory comparison columns */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-400 mb-2">
                                <CheckCircle2 className="w-4 h-4" /> Vi är överens om:
                            </h4>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1">
                                {party.strongestAgreements?.length > 0 ? (
                                    party.strongestAgreements.map((item, i) => <li key={i}>{item}</li>)
                                ) : (
                                    <li className="text-gray-400 italic">Inga starka gemensamma frågor.</li>
                                )}
                            </ul>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400 mb-2">
                                <XCircle className="w-4 h-4" /> Vi tycker olika om:
                            </h4>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1">
                                {party.strongestDisagreements?.length > 0 ? (
                                    party.strongestDisagreements.map((item, i) => <li key={i}>{item}</li>)
                                ) : (
                                    <li className="text-gray-400 italic">Inga starka konflikter.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4 py-8">
        <Button onClick={onRestart} variant="secondary">
          <RefreshCw className="w-5 h-5" />
          Gör om testet
        </Button>
        <Button onClick={handleShare} variant="outline" className="dark:text-white dark:border-gray-600 dark:hover:bg-gray-700">
          <Share2 className="w-5 h-5" />
          Dela resultat
        </Button>
      </div>
    </div>
  );
};
