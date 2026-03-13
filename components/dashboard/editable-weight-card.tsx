"use client";

import { useState, useRef } from "react";
import { Scale, Check, Loader2 } from "lucide-react";

interface EditableWeightCardProps {
  initialWeight: number;
  startingWeight: number;
}

export function EditableWeightCard({ initialWeight, startingWeight }: EditableWeightCardProps) {
  const [weight, setWeight] = useState(initialWeight);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedTimer = useRef<NodeJS.Timeout>(undefined);

  const weightChange = weight - startingWeight;

  const handleSave = async () => {
    if (weight <= 0 || weight === initialWeight) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      // Update profile
      const profileRes = await fetch("/api/profile");
      if (!profileRes.ok) throw new Error();
      const profileData = await profileRes.json();
      const { activities: _a, ...rest } = profileData;
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rest, weightKg: weight }),
      });
      // Log to progress
      await fetch("/api/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: weight }),
      });
      setSaved(true);
      setEditing(false);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 3000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="bg-[#111] border border-[#222] rounded-2xl p-5 cursor-pointer group"
      onClick={() => {
        if (!editing) {
          setEditing(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#555] uppercase tracking-wider">Current Weight</p>
        {saving ? (
          <Loader2 className="h-4 w-4 text-[#00d4ff] animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4 text-[#00d4ff]" />
        ) : (
          <Scale className="h-4 w-4 text-[#00d4ff]" />
        )}
      </div>
      {editing ? (
        <div className="flex items-baseline gap-1.5">
          <input
            ref={inputRef}
            type="number"
            value={weight || ""}
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setEditing(false); setWeight(initialWeight); }
            }}
            step="0.1"
            min="20"
            max="300"
            className="w-24 text-2xl font-bold text-white tracking-tight bg-transparent border-b border-[#00d4ff] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-sm text-[#555]">kg</span>
        </div>
      ) : (
        <p className="text-2xl font-bold text-white tracking-tight">
          {weight.toFixed(1)} kg
          <span className="text-xs font-normal text-[#555] ml-2 opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
        </p>
      )}
      <p className="text-xs mt-1 text-[#00d4ff]">
        {weightChange === 0
          ? "Starting weight"
          : weightChange < 0
            ? `↓ ${Math.abs(weightChange).toFixed(1)} kg lost`
            : `↑ ${weightChange.toFixed(1)} kg gained`}
      </p>
    </div>
  );
}
