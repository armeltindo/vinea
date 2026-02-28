
import React from 'react';
import { Sparkles, Loader2, Info } from 'lucide-react';
import { cn } from '../utils';

interface AIAnalysisProps {
  analysis: string | null;
  isLoading: boolean;
  className?: string;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ analysis, isLoading, className }) => {
  if (!analysis && !isLoading) return null;

  return (
    <div className={cn(
      "mb-6 animate-in fade-in slide-in-from-top-4 duration-500",
      className
    )}>
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
          <Sparkles size={48} className="text-indigo-600" />
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
            <Sparkles size={15} />
          </div>
          <h3 className="text-sm font-semibold text-indigo-900">Analyse Intelligente Vinea</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 py-2 text-indigo-600">
            <Loader2 size={17} className="animate-spin shrink-0" />
            <span className="text-sm font-medium italic text-indigo-700">Gemini analyse les tendances en temps réel…</span>
          </div>
        ) : (
          <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-normal">
            {analysis}
          </div>
        )}

        {!isLoading && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-400 pt-3 border-t border-indigo-100/60">
            <Info size={12} />
            <span>Basé sur les données actuelles de l'église</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysis;
