"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, RotateCcw } from "lucide-react";

interface ShoppingListCardProps {
  mealPlanContent: string;
}

function parseShoppingList(content: string): { category: string; items: string[] }[] {
  const marker = "## Weekly Shopping List";
  const idx = content.indexOf(marker);
  if (idx === -1) return [];

  const section = content.slice(idx + marker.length).trim();
  const lines = section.split("\n");

  const categories: { category: string; items: string[] }[] = [];
  let current: { category: string; items: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Category heading: ### or **text** or text followed by :
    if (trimmed.startsWith("###")) {
      if (current) categories.push(current);
      current = { category: trimmed.replace(/^#+\s*/, "").replace(/\*+/g, ""), items: [] };
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      if (current) categories.push(current);
      current = { category: trimmed.replace(/\*+/g, ""), items: [] };
    } else if (/^[A-Z].*:$/.test(trimmed)) {
      if (current) categories.push(current);
      current = { category: trimmed.replace(/:$/, ""), items: [] };
    } else if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•")) {
      const item = trimmed.replace(/^[-*•]\s*/, "").replace(/\*+/g, "").trim();
      if (item) {
        if (!current) current = { category: "Items", items: [] };
        current.items.push(item);
      }
    }
  }

  if (current && current.items.length > 0) categories.push(current);
  return categories.filter((c) => c.items.length > 0);
}

const STORAGE_KEY = "shopping-list-checked";

export function ShoppingListCard({ mealPlanContent }: ShoppingListCardProps) {
  const categories = parseShoppingList(mealPlanContent);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setChecked(new Set(JSON.parse(saved)));
    } catch {
      // ignore
    }
  }, []);

  const toggleItem = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const clearAll = () => {
    setChecked(new Set());
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  if (categories.length === 0) {
    return null;
  }

  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);
  const checkedCount = checked.size;

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Weekly Shopping List</h2>
            <p className="text-xs text-[#555] mt-0.5">{checkedCount} / {totalItems} items</p>
          </div>
        </div>
        {checkedCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#555] border border-[#2a2a2a] rounded-lg hover:border-[#333] hover:text-[#999] transition-all"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div key={cat.category}>
            <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-medium">{cat.category}</p>
            <div className="space-y-1.5">
              {cat.items.map((item) => {
                const key = `${cat.category}::${item}`;
                const isChecked = checked.has(key);
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                      isChecked ? "bg-[#00d4ff] border-[#00d4ff]" : "border-[#333] group-hover:border-[#555]"
                    }`}>
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(key)}
                      className="sr-only"
                    />
                    <span className={`text-sm transition-all ${isChecked ? "line-through text-[#444]" : "text-[#999] group-hover:text-white"}`}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
