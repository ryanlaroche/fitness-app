"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, Dumbbell, ChevronDown, CheckCircle, Save, Check, Shuffle, X, Loader2 } from "lucide-react";
import { ExerciseTooltip } from "@/components/plans/exercise-tooltip";

interface WorkoutCardProps {
  content: string;
  planId: number;
  onRegenerate: () => Promise<void>;
  onContentChange?: (newContent: string) => void;
  trackPerSet?: boolean;
}

type SetEntry = { weightKg: number | ""; reps: number | "" };

type WeightEntry = {
  exercise: string;
  weightKg: number | "";
  reps: number | "";
  sets?: SetEntry[];
};

interface DaySection {
  header: string;
  body: string;
  exerciseCount: number;
}

type SwapOption = { row: string; name: string; details: string };

type SwapOptions = {
  key: string;
  options: SwapOption[];
  currentRow: string;
} | null;

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

function NumericInput({
  value,
  onChange,
  placeholder,
  mode,
  className,
}: {
  value: number | "";
  onChange: (v: number | "") => void;
  placeholder: string;
  mode: "decimal" | "numeric";
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(String(value === "" ? "" : value));
  const prevValue = useRef(value);

  // Sync from parent only when the parent value actually changes (not from our own blur)
  if (value !== prevValue.current) {
    prevValue.current = value;
    setLocalValue(String(value === "" ? "" : value));
  }

  return (
    <input
      type="text"
      inputMode={mode}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => {
        const raw = e.target.value;
        // Allow empty, digits, and one decimal point for weight
        if (mode === "decimal" && /^[0-9]*\.?[0-9]*$/.test(raw)) {
          setLocalValue(raw);
        } else if (mode === "numeric" && /^[0-9]*$/.test(raw)) {
          setLocalValue(raw);
        }
      }}
      onBlur={() => {
        if (localValue === "") {
          prevValue.current = "";
          onChange("");
        } else {
          const parsed = mode === "decimal" ? parseFloat(localValue) : parseInt(localValue, 10);
          if (!isNaN(parsed)) {
            prevValue.current = parsed;
            onChange(parsed);
          }
        }
      }}
      className={className}
    />
  );
}

function DaySectionBlock({
  section,
  sectionIdx,
  completed,
  toggleExercise,
  weightEntries,
  onWeightChange,
  onSetWeightChange,
  trackPerSet,
  onSwapExercise,
  swappingKey,
  swapOptions,
  onSelectSwap,
  onCancelSwap,
}: {
  section: DaySection;
  sectionIdx: number;
  completed: Set<string>;
  toggleExercise: (key: string) => void;
  weightEntries: Record<string, WeightEntry>;
  onWeightChange: (key: string, exercise: string, field: "weightKg" | "reps", value: number | "") => void;
  onSetWeightChange: (key: string, exercise: string, setIndex: number, field: "weightKg" | "reps", value: number | "", totalSets: number) => void;
  trackPerSet: boolean;
  onSwapExercise: (key: string, exerciseName: string, dayHeader: string) => void;
  swappingKey: string | null;
  swapOptions: SwapOptions;
  onSelectSwap: (row: string) => void;
  onCancelSwap: () => void;
}) {
  const [manualCollapse, setManualCollapse] = useState<boolean | null>(null);
  const swapPickerRef = useRef<HTMLDivElement>(null);

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
  let colIndex = 0;

  const components: Components = {
    table({ children, ...props }) {
      tableId++;
      rowIndex = 0;
      isExerciseTable = false;
      return <table {...props}>{children}</table>;
    },
    tr({ children, ...props }) {
      const currentRow = rowIndex++;
      colIndex = 0;
      if (currentRow === 0) {
        // Detect exercise tables by checking for "Sets" or "Suggested Weight" in header
        const headerText = extractText(children).toLowerCase();
        isExerciseTable = headerText.includes("sets") || headerText.includes("suggested weight");

        return (
          <tr {...props}>
            <th className="!pr-0 !pl-2 w-8"></th>
            {children}
            {isExerciseTable && !trackPerSet && (
              <>
                <th className="text-xs font-medium text-[#555] !px-2 whitespace-nowrap">Actual Wt</th>
                <th className="text-xs font-medium text-[#555] !px-2 whitespace-nowrap">Actual Reps</th>
                <th className="w-8"></th>
              </>
            )}
            {isExerciseTable && trackPerSet && (
              <th className="w-8"></th>
            )}
          </tr>
        );
      }

      const key = `s${sectionIdx}-${tableId}-${currentRow}`;
      const isDone = completed.has(key);
      const entry = weightEntries[key];
      const isLoading = swappingKey === key;
      const hasOptions = swapOptions?.key === key;

      // Extract exercise name from the first td child
      const childArray = Array.isArray(children) ? children : [children];
      const exerciseName = entry?.exercise || extractText(childArray[0]) || "";

      // Parse set count from "Sets" column (typically 2nd column, e.g. "3", "4x", "3-4")
      const setsText = extractText(childArray[1]) || "";
      const setsMatch = setsText.match(/(\d+)/);
      const setCount = setsMatch ? parseInt(setsMatch[1], 10) : 3;

      const inputClass = "w-16 px-1.5 py-1 text-xs bg-[#1a1a1a] border border-[#333] rounded text-white placeholder-[#555] focus:border-[#00d4ff] focus:outline-none";
      const repsInputClass = "w-14 px-1.5 py-1 text-xs bg-[#1a1a1a] border border-[#333] rounded text-white placeholder-[#555] focus:border-[#00d4ff] focus:outline-none";

      return (
        <>
          <tr
            {...props}
            className={`group cursor-pointer transition-opacity ${isDone ? "opacity-40" : ""} ${isLoading ? "animate-pulse" : ""} ${hasOptions ? "bg-[#00d4ff]/5" : ""}`}
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
            {isExerciseTable && !trackPerSet && (
              <>
                <td className="!px-1 align-middle" onClick={(e) => e.stopPropagation()}>
                  <NumericInput
                    value={entry?.weightKg ?? ""}
                    onChange={(v) => onWeightChange(key, exerciseName, "weightKg", v)}
                    placeholder="kg"
                    mode="decimal"
                    className={inputClass}
                  />
                </td>
                <td className="!px-1 align-middle" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <NumericInput
                      value={entry?.reps ?? ""}
                      onChange={(v) => onWeightChange(key, exerciseName, "reps", v)}
                      placeholder="reps"
                      mode="numeric"
                      className={repsInputClass}
                    />
                    {entry?.weightKg !== undefined && entry?.weightKg !== "" && entry?.reps !== undefined && entry?.reps !== "" && (
                      <span className="text-[10px] text-[#00d4ff]/60 whitespace-nowrap">
                        {Math.round(Number(entry.weightKg) * (1 + Number(entry.reps) / 30))}kg
                      </span>
                    )}
                  </div>
                </td>
                <td className="!px-1 align-middle" onClick={(e) => e.stopPropagation()}>
                  {hasOptions ? (
                    <button
                      onClick={onCancelSwap}
                      title="Cancel swap"
                      className="p-1 rounded text-[#555] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onSwapExercise(key, exerciseName, section.header)}
                      disabled={isLoading || !!swappingKey || !!swapOptions}
                      title="Swap for a different exercise"
                      className="p-1 rounded text-[#555] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Shuffle className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </td>
              </>
            )}
            {isExerciseTable && trackPerSet && (
              <td className="!px-1 align-middle" onClick={(e) => e.stopPropagation()}>
                {hasOptions ? (
                  <button
                    onClick={onCancelSwap}
                    title="Cancel swap"
                    className="p-1 rounded text-[#555] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => onSwapExercise(key, exerciseName, section.header)}
                    disabled={isLoading || !!swappingKey || !!swapOptions}
                    title="Swap for a different exercise"
                    className="p-1 rounded text-[#555] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Shuffle className="h-3 w-3" />
                    )}
                  </button>
                )}
              </td>
            )}
          </tr>
          {isExerciseTable && trackPerSet && (
            <>
              {Array.from({ length: setCount }, (_, si) => {
                const setEntry = entry?.sets?.[si];
                return (
                  <tr key={`${key}-set-${si}`} className={`${isDone ? "opacity-40" : ""}`}>
                    <td></td>
                    <td colSpan={2} className="!py-0.5 !pl-4">
                      <span className="text-[10px] text-[#555] font-medium">Set {si + 1}</span>
                    </td>
                    <td className="!px-1 !py-0.5" colSpan={2} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <NumericInput
                          value={setEntry?.weightKg ?? ""}
                          onChange={(v) => onSetWeightChange(key, exerciseName, si, "weightKg", v, setCount)}
                          placeholder="kg"
                          mode="decimal"
                          className={inputClass}
                        />
                        <NumericInput
                          value={setEntry?.reps ?? ""}
                          onChange={(v) => onSetWeightChange(key, exerciseName, si, "reps", v, setCount)}
                          placeholder="reps"
                          mode="numeric"
                          className={repsInputClass}
                        />
                        {setEntry?.weightKg !== undefined && setEntry?.weightKg !== "" && setEntry?.reps !== undefined && setEntry?.reps !== "" && (
                          <span className="text-[10px] text-[#00d4ff]/60 whitespace-nowrap">
                            {Math.round(Number(setEntry.weightKg) * (1 + Number(setEntry.reps) / 30))}kg
                          </span>
                        )}
                      </div>
                    </td>
                    <td></td>
                  </tr>
                );
              })}
            </>
          )}
        </>
      );
    },
    td({ children, ...props }) {
      const currentCol = colIndex++;
      const key = `s${sectionIdx}-${tableId}-${rowIndex - 1}`;
      const isDone = completed.has(key);
      const isFirstCol = currentCol === 0 && isExerciseTable && rowIndex > 1;
      return (
        <td {...props} className={isDone ? "line-through" : ""}>
          {isFirstCol ? (
            <ExerciseTooltip exerciseName={extractText(children)}>
              {children}
            </ExerciseTooltip>
          ) : (
            children
          )}
        </td>
      );
    },
    a({ children }) {
      // Render links as plain text (strip YouTube links from exercises)
      return <>{children}</>;
    },
  };

  const showSwapPicker = !!(swapOptions && swapOptions.key.startsWith(`s${sectionIdx}-`));

  useEffect(() => {
    if (showSwapPicker && swapPickerRef.current) {
      swapPickerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showSwapPicker]);

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
            {showSwapPicker && swapOptions && (
              <div ref={swapPickerRef} className="not-prose mt-3 border border-[#00d4ff]/20 bg-[#0d1b1f] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-medium text-[#00d4ff]">Choose a replacement exercise</span>
                  <button
                    onClick={onCancelSwap}
                    className="p-0.5 rounded text-[#555] hover:text-white transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {swapOptions.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectSwap(opt.row)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-[#111] border border-[#222] hover:border-[#00d4ff]/40 hover:bg-[#00d4ff]/5 transition-all group/opt"
                    >
                      <span className="text-sm text-white group-hover/opt:text-[#00d4ff] transition-colors">{opt.name}</span>
                      {opt.details && (
                        <span className="block text-[11px] text-[#555] mt-0.5">{opt.details}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkoutCard({ content, planId, onRegenerate, onContentChange, trackPerSet = false }: WorkoutCardProps) {
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
  const [swapOptions, setSwapOptions] = useState<SwapOptions>(null);
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
    const hasAnyData = Object.values(weightEntries).some((e) => {
      if (!e.exercise) return false;
      if (e.sets && e.sets.some((s) => s.weightKg !== "" && s.reps !== "")) return true;
      return e.weightKg !== "" && e.reps !== "";
    });
    if (!hasAnyData) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const liftingNotes = Object.values(weightEntries)
        .filter((e) => e.exercise)
        .map((e) => {
          if (e.sets && e.sets.some((s) => s.weightKg !== "" || s.reps !== "")) {
            return {
              exercise: e.exercise,
              sets: e.sets
                .filter((s) => s.weightKg !== "" && s.reps !== "")
                .map((s) => ({ weightKg: Number(s.weightKg), reps: Number(s.reps) })),
            };
          }
          if (e.weightKg !== "" && e.reps !== "") {
            return { exercise: e.exercise, weightKg: Number(e.weightKg), reps: Number(e.reps) };
          }
          return null;
        })
        .filter(Boolean);

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

  const handleSetWeightChange = useCallback(
    (key: string, exercise: string, setIndex: number, field: "weightKg" | "reps", value: number | "", totalSets: number) => {
      setWeightEntries((prev) => {
        const existing = prev[key] || { exercise, weightKg: "", reps: "" };
        const sets = [...(existing.sets || Array.from({ length: totalSets }, () => ({ weightKg: "" as number | "", reps: "" as number | "" })))];
        // Ensure array is long enough
        while (sets.length < totalSets) {
          sets.push({ weightKg: "", reps: "" });
        }
        sets[setIndex] = { ...sets[setIndex], [field]: value };
        const next = {
          ...prev,
          [key]: { ...existing, exercise, sets },
        };
        localStorage.setItem(entriesKey, JSON.stringify(next));
        return next;
      });
      setSaved(false);
    },
    [entriesKey]
  );

  const handleSaveWorkout = async () => {
    const hasAnyData = Object.values(weightEntries).some((e) => {
      if (!e.exercise) return false;
      if (e.sets && e.sets.some((s) => s.weightKg !== "" && s.reps !== "")) return true;
      return e.weightKg !== "" && e.reps !== "";
    });
    if (!hasAnyData) return;

    setSaving(true);
    try {
      const liftingNotes = Object.values(weightEntries)
        .filter((e) => e.exercise)
        .map((e) => {
          if (e.sets && e.sets.some((s) => s.weightKg !== "" || s.reps !== "")) {
            return {
              exercise: e.exercise,
              sets: e.sets
                .filter((s) => s.weightKg !== "" && s.reps !== "")
                .map((s) => ({ weightKg: Number(s.weightKg), reps: Number(s.reps) })),
            };
          }
          if (e.weightKg !== "" && e.reps !== "") {
            return { exercise: e.exercise, weightKg: Number(e.weightKg), reps: Number(e.reps) };
          }
          return null;
        })
        .filter(Boolean);

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
      setSwapOptions(null);
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

        if (!res.ok) throw new Error("Failed to fetch exercise alternatives");
        const data = await res.json();
        const rows: string[] | undefined = data.rows;

        if (rows && rows.length > 0 && currentRow) {
          const options: SwapOption[] = rows.map((row: string) => {
            const cells = row.split("|").filter(Boolean).map((c: string) => c.trim());
            const name = cells[0] || "Unknown";
            const details = cells.length >= 4
              ? `${cells[1]} × ${cells[2]} | Rest: ${cells[3]}${cells[4] ? ` | ${cells[4]}` : ""}`
              : "";
            return { row: row.trim(), name, details };
          });
          setSwapOptions({ key, options, currentRow: currentRow.trim() });
        }
      } catch (err) {
        console.error("Error fetching swap options:", err);
      } finally {
        setSwappingKey(null);
      }
    },
    [localContent]
  );

  const handleSelectSwap = useCallback(
    (row: string) => {
      if (!swapOptions) return;
      const newContent = localContent.replace(swapOptions.currentRow, row);
      setLocalContent(newContent);
      onContentChange?.(newContent);
      setSwapOptions(null);
    },
    [swapOptions, localContent, onContentChange]
  );

  const handleCancelSwap = useCallback(() => {
    setSwapOptions(null);
  }, []);

  const hasEntries = Object.values(weightEntries).some((e) => {
    if (!e.exercise) return false;
    if (e.sets && e.sets.some((s) => s.weightKg !== "" && s.reps !== "")) return true;
    return e.weightKg !== "" && e.reps !== "";
  });

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
            onSetWeightChange={handleSetWeightChange}
            trackPerSet={trackPerSet}
            onSwapExercise={handleSwapExercise}
            swappingKey={swappingKey}
            swapOptions={swapOptions}
            onSelectSwap={handleSelectSwap}
            onCancelSwap={handleCancelSwap}
          />
        ))}
      </div>
    </div>
  );
}
