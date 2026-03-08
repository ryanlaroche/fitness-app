"use client";

import { useState } from "react";
import { Loader2, Check, Plus, X } from "lucide-react";
import { EQUIPMENT_OPTIONS } from "@/lib/types";

type EquipmentManagerProps = {
  initialEquipmentType: string;
  initialEquipmentItems: string[];
};

export function EquipmentManager({
  initialEquipmentType,
  initialEquipmentItems,
}: EquipmentManagerProps) {
  const [equipmentType, setEquipmentType] = useState(initialEquipmentType);
  const [selectedItems, setSelectedItems] = useState<string[]>(initialEquipmentItems);
  const [customInput, setCustomInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const availableItems = EQUIPMENT_OPTIONS[equipmentType] ?? [];

  const handleTypeChange = (newType: string) => {
    setEquipmentType(newType);
    const validItems = EQUIPMENT_OPTIONS[newType] ?? [];
    setSelectedItems((prev) => prev.filter((i) => validItems.includes(i)));
    setSaved(false);
  };

  const toggleItem = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
    setSaved(false);
  };

  const addCustomItem = () => {
    const item = customInput.trim();
    if (!item || selectedItems.includes(item)) return;
    setSelectedItems((prev) => [...prev, item]);
    setCustomInput("");
    setSaved(false);
  };

  const removeCustomItem = (item: string) => {
    setSelectedItems((prev) => prev.filter((i) => i !== item));
    setSaved(false);
  };

  const customItems = selectedItems.filter((i) => !availableItems.includes(i));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const profileRes = await fetch("/api/profile");
      if (!profileRes.ok) throw new Error("Failed to fetch profile");
      const profile = await profileRes.json();

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          availableEquipment: equipmentType,
          equipmentItems: equipmentType === "none" ? [] : selectedItems,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    "w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg focus:outline-none focus:border-[#00d4ff] text-white text-sm transition-colors";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#555] uppercase tracking-wider mb-2">
          Equipment Type
        </label>
        <select className={selectClass} value={equipmentType}
          onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="none">No Equipment (Bodyweight Only)</option>
          <option value="dumbbells">Dumbbells</option>
          <option value="home_gym">Home Gym Setup</option>
          <option value="gym">Full Gym Access</option>
        </select>
      </div>

      {equipmentType !== "none" && availableItems.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-[#555] uppercase tracking-wider mb-2">
            Items Available
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleItem(item)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                  selectedItems.includes(item)
                    ? "border-[#00d4ff]/40 bg-[#00d4ff]/5 text-white"
                    : "border-[#222] text-[#555] hover:border-[#333] hover:text-[#999]"
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                  selectedItems.includes(item)
                    ? "bg-[#00d4ff] border-[#00d4ff]"
                    : "border-[#333]"
                }`}>
                  {selectedItems.includes(item) && <Check className="h-2.5 w-2.5 text-black" />}
                </div>
                <span className="text-xs">{item}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom equipment */}
      {equipmentType !== "none" && (
        <div>
          <label className="block text-xs font-medium text-[#555] uppercase tracking-wider mb-2">
            Add Custom Equipment
          </label>
          {customItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {customItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-lg text-xs text-[#00d4ff]"
                >
                  {item}
                  <button onClick={() => removeCustomItem(item)} className="hover:text-white transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomItem(); } }}
              placeholder="e.g., Ab Roller, TRX Straps"
              className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#00d4ff] transition-colors"
            />
            <button
              type="button"
              onClick={addCustomItem}
              disabled={!customInput.trim()}
              className="flex items-center gap-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-[#555] hover:text-white hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-[#00d4ff] text-black font-semibold rounded-lg hover:bg-[#33dcff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saved ? "Saved ✓" : saving ? "Saving..." : "Save Equipment"}
      </button>
    </div>
  );
}
