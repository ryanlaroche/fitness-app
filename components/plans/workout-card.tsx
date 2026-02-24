"use client";

import { useState, useCallback } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, Dumbbell } from "lucide-react";

interface WorkoutCardProps {
  content: string;
  onRegenerate: () => Promise<void>;
}

function stripWarmUp(markdown: string): string {
  // Remove sections with headers containing "warm" or "cool" (case-insensitive)
  return markdown.replace(
    /^#{1,4}\s+.*(?:warm[\s-]?up|cool[\s-]?down).*$\n(?:(?!^#{1,4}\s).*\n?)*/gim,
    ""
  );
}

export function WorkoutCard({ content, onRegenerate }: WorkoutCardProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const handleRegenerate = async () => {
    setRegenerating(true);
    setCompleted(new Set());
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  const toggleExercise = useCallback((key: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const cleaned = stripWarmUp(content);

  // Track row index per table to generate stable keys
  let tableId = 0;
  let rowIndex = 0;

  const components: Components = {
    table({ children, ...props }) {
      tableId++;
      rowIndex = 0;
      return <table {...props}>{children}</table>;
    },
    tr({ children, ...props }) {
      const currentRow = rowIndex++;
      // Row 0 is the header row (contains <th>), skip it
      if (currentRow === 0) {
        return <tr {...props}>{children}</tr>;
      }

      const key = `${tableId}-${currentRow}`;
      const isDone = completed.has(key);

      return (
        <tr
          {...props}
          className={`group cursor-pointer transition-opacity ${isDone ? "opacity-40" : ""}`}
          onClick={() => toggleExercise(key)}
        >
          <td className="!pr-0 !pl-2 w-8 align-middle">
            <input
              type="checkbox"
              checked={isDone}
              onChange={() => toggleExercise(key)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-[#444] bg-[#1a1a1a] accent-[#00d4ff] cursor-pointer"
            />
          </td>
          {children}
        </tr>
      );
    },
    // Add an extra header cell for the checkbox column
    thead({ children, ...props }) {
      return <thead {...props}>{children}</thead>;
    },
    th({ children, ...props }) {
      // We need to detect the first th in a row to prepend the checkbox column header
      return <th {...props}>{children}</th>;
    },
    td({ children, ...props }) {
      const key = `${tableId}-${rowIndex - 1}`;
      const isDone = completed.has(key);
      return (
        <td {...props} className={isDone ? "line-through" : ""}>
          {children}
        </td>
      );
    },
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center">
            <Dumbbell className="h-4 w-4 text-[#00d4ff]" />
          </div>
          <h2 className="text-base font-semibold text-white tracking-tight">Workout Plan</h2>
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
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {cleaned}
        </ReactMarkdown>
      </div>
    </div>
  );
}
