"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, Dumbbell, ChevronDown, CheckCircle, Save, Check, Shuffle } from "lucide-react";

interface WorkoutCardProps {
  content: string;
  planId: number;
  onRegenerate: () => Promise<void>;
  onContentChange?: (newContent: string) => void;
}

type WeightEntry = {
  exercise: string;
  weightKg: number | "";
  reps: number | "";
};

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

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function DaySectionBlock({
  section,
  sectionIdx,
  completed,
  toggleExercise,
  weightEntries,
  onWeightChange,
  onSwapExercise,
  swappingKey,
}: {
  section: DaySection;
  sectionIdx: number;
  completed: Set<string>;
  toggleExercise: (key: string) => void;
  weightEntries: Record<string, WeightEntry>;
  onWeightChange: (key: string, exercise: string, field: "weightKg" | "reps", value: number | "") => void;
  onSwapExercise: (key: string, exerciseName: string, dayHeader: string) => void;
  swappingKey: string | null;
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
  let isExerciseTable = false;

  const components: Components = {
    table({ children, ...props }) {
      tableId++;
      rowIndex = 0;
      isExerciseTable = false;
      return <table {...props}>{children}</table>;
    },
    tr({ children, ...props }) {
      const currentRow = rowIndex++;
      if (currentRow === 0) {
        // Detect exercise tables by checking for "Sets" or "Suggested Weight" in header
        const headerText = extractText(children).toLowerCase();
        isExerciseTable = headerText.includes("sets") || headerText.includes("suggested weight");

        return (
          <tr {...props}>
            <th className="!pr-0 !pl-2 w-8"></th>
            {children}
            {isExerciseTable && (
              <>
                <th className="text-xs font-medium text-[#555] !px-2 whitespace-nowrap">Actual Wt</th>
                <th className="text-xs font-medium text-[#555] !px-2 whitespace-nowrap">Actual Reps</th>
                <th className="w-8"></th>
              </>
            )}
          </tr>
        );
      }

      const key = `s${sectionIdx}-${tableId}-${currentRow}`;
      const isDone = completed.has(key);
      const entry = weightEntries[key];
      const isSwapping = swappingKey === key;

      // Extract exercise name from the first td child
      const childArray = Array.isArray(children) ? children : [children];
      const exerciseName = entry?.exercise || extractText(childArray[0]) || "";

      return (
        <tr
          {...props}
          className={`group cursor-pointer transition-opacity ${isDone ? "opacity-40" : ""} ${isSwapping ? "animate-pulse" : ""}`}
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
          {isExerciseTable && (
            <>
              <td className="!px-1 align-middle" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="kg"
                  value={entry?.weightKg ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? "" : parseFloat(e.target.value);
                    onWeightChange(key, exerciseName, "weightKg", v);
                  }}
                  className="w-16 px-1.5 py-1 text-xs bg-[#1a1a1a] border border-[#333] rounded text-white placeholder-[#555] focus:border-[#00d4ff] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </td>
              <td className="!px-1 align-middle" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="reps"
                    value={entry?.reps ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                      onWeightChange(key, exerciseName, "reps", v);
                    }}
                    className="w-14 px-1.5 py-1 text-xs bg-[#1a1a1a] border border-[#333] rounded text-white placeholder-[#555] focus:border-[#00d4ff] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  {entry?.weightKg !== undefined && entry?.weightKg !== "" && entry?.reps !== undefined && entry?.reps !== "" && (
                    <span className="text-[10px] text-[#00d4ff]/60 whitespace-nowrap">
                      {Math.round(Number(entry.weightKg) * (1 + Number(entry.reps) / 30))}kg
                    </span>
                  )}
                </div>
              </td>
              <td className="!px-1 align-middle" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onSwapExercise(key, exerciseName, section.header)}
                  disabled={isSwapping || !!swappingKey}
                  title="Swap for a different exercise"
                  className="p-1 rounded text-[#555] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Shuffle className={`h-3 w-3 ${isSwapping ? "animate-spin" : ""}`} />
                </button>
              </td>
            </>
          )}
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

export function WorkoutCard({ content, planId, onRegenerate, onContentChange }: WorkoutCardProps) {
  const completedKey = `workout-completed-${planId}`;
  const entriesKey = `workout-entries-${planId}`;

  const [regenerating, setRegenerating] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(completedKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [weightEntries, setWeightEntries] = useState<Record<string, WeightEntry>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(entriesKey);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  const [swappingKey, setSwappingKey] = useState<string | null>(null);
  const savedTimerRef = useRef<NodeJS.Timeout>(undefined);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>(undefined);

  // Sync local content when parent content changes (e.g. regenerate)
  const prevContentRef = useRef(content);
  if (content !== prevContentRef.current) {
    prevContentRef.current = content;
    setLocalContent(content);
  }

  // Debounced auto-save to server when weightEntries change
  useEffect(() => {
    const entries = Object.values(weightEntries).filter(
      (e) => e.exercise && e.weightKg !== "" && e.reps !== ""
    );
    if (entries.length === 0) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const liftingNotes = entries.map((e) => ({
        exercise: e.exercise,
        weightKg: Number(e.weightKg),
        reps: Number(e.reps),
      }));

      try {
        const res = await fetch("/api/progress", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workoutDone: true,
            liftingNotes: JSON.stringify(liftingNotes),
          }),
        });
        if (res.ok) {
          setSaved(true);
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => setSaved(false), 3000);
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [weightEntries]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setCompleted(new Set());
    setWeightEntries({});
    setSaved(false);
    localStorage.removeItem(completedKey);
    localStorage.removeItem(entriesKey);
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
      localStorage.setItem(completedKey, JSON.stringify([...next]));
      return next;
    });
  }, [completedKey]);

  const handleWeightChange = useCallback(
    (key: string, exercise: string, field: "weightKg" | "reps", value: number | "") => {
      setWeightEntries((prev) => {
        const next = {
          ...prev,
          [key]: {
            ...prev[key],
            exercise: exercise || prev[key]?.exercise || "",
            [field]: value,
          } as WeightEntry,
        };
        localStorage.setItem(entriesKey, JSON.stringify(next));
        return next;
      });
      setSaved(false);
    },
    [entriesKey]
  );

  const handleSaveWorkout = async () => {
    const entries = Object.values(weightEntries).filter(
      (e) => e.exercise && e.weightKg !== "" && e.reps !== ""
    );
    if (entries.length === 0) return;

    setSaving(true);
    try {
      const liftingNotes = entries.map((e) => ({
        exercise: e.exercise,
        weightKg: Number(e.weightKg),
        reps: Number(e.reps),
      }));

      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutDone: true,
          liftingNotes: JSON.stringify(liftingNotes),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      console.error("Error saving workout:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSwapExercise = useCallback(
    async (key: string, exerciseName: string, dayHeader: string) => {
      if (!exerciseName) return;
      setSwappingKey(key);
      try {
        // Find the markdown line for this exercise
        const lines = localContent.split("\n");
        const currentRow = lines.find((line) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith("|")) return false;
          const firstCell = trimmed.split("|")[1]?.trim().toLowerCase() || "";
          return firstCell === exerciseName.toLowerCase();
        });

        // Collect other exercise names in the same day section
        const sectionMatch = localContent.split(/^(## .+)$/m);
        let sectionBody = "";
        for (let i = 1; i < sectionMatch.length; i += 2) {
          if (sectionMatch[i].includes(dayHeader)) {
            sectionBody = sectionMatch[i + 1] || "";
            break;
          }
        }
        const otherExercises = sectionBody
          .split("\n")
          .filter((l) => l.trim().startsWith("|") && !l.includes("---") && !l.toLowerCase().includes("exercise"))
          .map((l) => l.split("|")[1]?.trim())
          .filter((n) => n && n.toLowerCase() !== exerciseName.toLowerCase());

        const res = await fetch("/api/generate/exercise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseName,
            currentRow: currentRow || "",
            dayHeader,
            otherExercises,
          }),
        });

        if (!res.ok) throw new Error("Failed to swap exercise");
        const { row } = await res.json();

        if (row && currentRow) {
          const newContent = localContent.replace(currentRow.trim(), row.trim());
          setLocalContent(newContent);
          onContentChange?.(newContent);
        }
      } catch (err) {
        console.error("Error swapping exercise:", err);
      } finally {
        setSwappingKey(null);
      }
    },
    [localContent, onContentChange]
  );

  const hasEntries = Object.values(weightEntries).some(
    (e) => e.exercise && e.weightKg !== "" && e.reps !== ""
  );

  const cleaned = stripWarmUp(localContent);
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
        <div className="flex items-center gap-2">
          {hasEntries && (
            <button
              onClick={handleSaveWorkout}
              disabled={saving || saved}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-all ${
                saved
                  ? "border border-[#00d4ff]/30 text-[#00d4ff] bg-[#00d4ff]/5"
                  : "border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              {saved ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? "Saving..." : saved ? "Saved" : "Save Workout"}
            </button>
          )}
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-3 py-1.5 text-xs border border-[#333] text-[#999] rounded-lg hover:border-[#444] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      </div>
      <div className="p-6 flex flex-col gap-3">
        {sections.map((section, idx) => (
          <DaySectionBlock
            key={idx}
            section={section}
            sectionIdx={idx}
            completed={completed}
            toggleExercise={toggleExercise}
            weightEntries={weightEntries}
            onWeightChange={handleWeightChange}
            onSwapExercise={handleSwapExercise}
            swappingKey={swappingKey}
          />
        ))}
      </div>
    </div>
  );
}
