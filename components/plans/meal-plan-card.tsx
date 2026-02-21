"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, UtensilsCrossed } from "lucide-react";

interface MealPlanCardProps {
  content: string;
  onRegenerate: () => Promise<void>;
}

export function MealPlanCard({ content, onRegenerate }: MealPlanCardProps) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="h-4 w-4 text-orange-400" />
          </div>
          <h2 className="text-base font-semibold text-white tracking-tight">Meal Plan</h2>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-2 px-3 py-1.5 text-xs border border-[#333] text-[#999] rounded-lg hover:border-[#444] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
          {regenerating ? "Regenerating..." : "Regenerate"}
        </button>
      </div>
      <div className="p-6 prose prose-sm max-w-none prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-base prose-h3:text-sm prose-p:text-[#999] prose-li:text-[#999] prose-strong:text-white prose-table:text-sm prose-hr:border-[#222] prose-code:text-[#00d4ff] prose-code:bg-[#1a1a1a]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
