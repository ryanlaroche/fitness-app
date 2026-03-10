"use client";

import { useState, useCallback, useMemo } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, Dumbbell, ChevronDown, CheckCircle } from "lucide-react";

interface WorkoutCardProps {
  content: string;
  onRegenerate: () => Promise<void>;
}

interface DaySection {
  header: string;
  body: string;
  exerciseCount: number;
}

function stripWarmUp(markdown: string): string {
  return markdown.replace(
    /^#{1,4}\s+.*(?:warm[\s-]?up|cool[\s-]?down).*$\n(?:(?!^#{1,4}\s).*\n?)*/gim,
    ""
  );
}

function parseDaySections(markdown: string): DaySection[] {
  const parts = markdown.split(/^(## .+)$/m);
  const sections: DaySection[] = [];

  // Content before first ## header (preamble)
  const preamble = parts[0]?.trim();
  if (preamble) {
    sections.push({ header: "", body: preamble, exerciseCount: 0 });
  }

  // Alternating header/body pairs
  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i].replace(/^##\s+/, "").trim();
    const body = parts[i + 1] || "";
    const exerciseCount = countExerciseRows(body);
    sections.push({ header, body, exerciseCount });
  }

  return sections;
}

function countExerciseRows(markdown: string): number {
  const lines = markdown.split("\n");
  let count = 0;
  let inTable = false;
  let rowInTable = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      if (!inTable) {
        inTable = true;
        rowInTable = 0;
      }
      rowInTable++;
      // Row 1 = header, Row 2 = separator (---), Row 3+ = data
      if (rowInTable > 2 && !trimmed.includes("---")) {
        count++;
      }
    } else {
      inTable = false;
      rowInTable = 0;
    }
  }
  return count;
}

function DaySectionBlock({
  section,
  sectionIdx,
  completed,
  toggleExercise,
}: {
  section: DaySection;
  sectionIdx: number;
  completed: Set<string>;
  toggleExercise: (key: string) => void;
}) {
  const [manualCollapse, setManualCollapse] = useState<boolean | null>(null);

  // Count completed exercises for this section
  const completedCount = useMemo(() => {
    let count = 0;
    completed.forEach((key) => {
      if (key.startsWith(`s${sectionIdx}-`)) count++;
    });
    return count;
  }, [completed, sectionIdx]);

  const allDone =
    section.exerciseCount > 0 && completedCount >= section.exerciseCount;
  const isCollapsed = manualCollapse ?? allDone;
  const hasExercises = section.exerciseCount > 0;

  // Track row index per table within this section
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
      if (currentRow === 0) {
        // Header row — add an empty th to match the checkbox column
        return (
          <tr {...props}>
            <th className="!pr-0 !pl-2 w-8"></th>
            {children}
          </tr>
        );
      }

      const key = `s${sectionIdx}-${tableId}-${currentRow}`;
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
    td({ children, ...props }) {
      const key = `s${sectionIdx}-${tableId}-${rowIndex - 1}`;
      const isDone = completed.has(key);
      return (
        <td {...props} className={isDone ? "line-through" : ""}>
          {children}
        </td>
      );
    },
    a({ children }) {
      // Render links as plain text (strip YouTube links from exercises)
      return <>{children}</>;
    },
  };

  // No header means preamble content — render inline, no collapsing
  if (!section.header) {
    return (
      <div className="prose prose-sm max-w-none prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-base prose-h3:text-sm prose-p:text-[#999] prose-li:text-[#999] prose-strong:text-white prose-table:text-sm prose-hr:border-[#222] prose-code:text-[#00d4ff] prose-code:bg-[#1a1a1a]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {section.body}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div
      className={`border border-[#222] rounded-xl overflow-hidden transition-colors ${allDone ? "border-[#00d4ff]/20 bg-[#00d4ff]/[0.02]" : "bg-[#0a0a0a]"}`}
    >
      <button
        onClick={() => setManualCollapse(isCollapsed ? false : true)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#151515] transition-colors"
      >
        <div className="flex items-center gap-3">
          {allDone ? (
            <CheckCircle className="h-4 w-4 text-[#00d4ff] flex-shrink-0" />
          ) : (
            <span className="text-xs text-[#555] font-mono w-4 text-center flex-shrink-0">
              {completedCount}/{section.exerciseCount}
            </span>
          )}
          <span
            className={`text-sm font-semibold tracking-tight ${allDone ? "text-[#00d4ff]" : "text-white"}`}
          >
            {section.header}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[#555] transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 prose prose-sm max-w-none prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-base prose-h3:text-sm prose-p:text-[#999] prose-li:text-[#999] prose-strong:text-white prose-table:text-sm prose-hr:border-[#222] prose-code:text-[#00d4ff] prose-code:bg-[#1a1a1a]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
              {section.body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
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
  const sections = useMemo(() => parseDaySections(cleaned), [cleaned]);

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
      <div className="p-6 flex flex-col gap-3">
        {sections.map((section, idx) => (
          <DaySectionBlock
            key={idx}
            section={section}
            sectionIdx={idx}
            completed={completed}
            toggleExercise={toggleExercise}
          />
        ))}
      </div>
    </div>
  );
}
