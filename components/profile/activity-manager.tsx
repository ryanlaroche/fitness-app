"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { ALL_DAYS, DayOfWeek, ActivityRecord } from "@/lib/types";

type ActivityManagerProps = {
  initialActivities: ActivityRecord[];
};

type EditState = {
  name: string;
  daysOfWeek: DayOfWeek[];
};

export function ActivityManager({ initialActivities }: ActivityManagerProps) {
  const [activities, setActivities] = useState<ActivityRecord[]>(initialActivities);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", daysOfWeek: [] });
  const [adding, setAdding] = useState(false);
  const [newActivity, setNewActivity] = useState<EditState>({ name: "", daysOfWeek: [] });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const toggleDay = (days: DayOfWeek[], day: DayOfWeek, setDays: (d: DayOfWeek[]) => void) => {
    setDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  };

  const startEdit = (activity: ActivityRecord) => {
    setEditingId(activity.id);
    setEditState({ name: activity.name, daysOfWeek: activity.daysOfWeek });
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState({ name: "", daysOfWeek: [] });
  };

  const saveEdit = async (id: number) => {
    if (!editState.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editState.name.trim(), daysOfWeek: editState.daysOfWeek }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated: ActivityRecord = await res.json();
      setActivities((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const deleteActivity = async (id: number) => {
    setDeleting(id);
    setError("");
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setActivities((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      setError("Failed to delete.");
    } finally {
      setDeleting(null);
    }
  };

  const saveNewActivity = async () => {
    if (!newActivity.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newActivity.name.trim(), daysOfWeek: newActivity.daysOfWeek }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const created: ActivityRecord = await res.json();
      setActivities((prev) => [...prev, created]);
      setNewActivity({ name: "", daysOfWeek: [] });
      setAdding(false);
    } catch (err) {
      console.error(err);
      setError("Failed to add activity.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg focus:outline-none focus:border-[#00d4ff] text-white placeholder:text-[#444] text-sm transition-colors";

  const DayPicker = ({
    selected,
    onChange,
  }: {
    selected: DayOfWeek[];
    onChange: (days: DayOfWeek[]) => void;
  }) => (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {ALL_DAYS.map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => toggleDay(selected, day, onChange)}
          className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
            selected.includes(day)
              ? "bg-[#00d4ff] border-[#00d4ff] text-black font-semibold"
              : "border-[#2a2a2a] text-[#555] hover:border-[#333] hover:text-[#999]"
          }`}
        >
          {day.slice(0, 3)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      {activities.length === 0 && !adding && (
        <p className="text-xs text-[#444] italic py-2">
          No activities added yet.
        </p>
      )}

      {activities.map((activity) => (
        <div key={activity.id} className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-3">
          {editingId === activity.id ? (
            <div className="space-y-2">
              <input type="text" className={inputClass} value={editState.name}
                onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                placeholder="Activity name" />
              <DayPicker
                selected={editState.daysOfWeek}
                onChange={(days) => setEditState((s) => ({ ...s, daysOfWeek: days }))}
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => saveEdit(activity.id)}
                  disabled={saving || !editState.name.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#00d4ff] text-black font-semibold text-xs rounded-lg hover:bg-[#33dcff] disabled:opacity-40 transition-colors">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Save
                </button>
                <button onClick={cancelEdit}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a2a] text-[#555] text-xs rounded-lg hover:border-[#333] hover:text-white transition-all">
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">{activity.name}</p>
                <p className="text-xs text-[#555] mt-0.5">
                  {activity.daysOfWeek.length > 0 ? activity.daysOfWeek.join(", ") : "No days set"}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => startEdit(activity)}
                  className="p-1.5 text-[#444] hover:text-[#00d4ff] rounded-lg transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteActivity(activity.id)}
                  disabled={deleting === activity.id}
                  className="p-1.5 text-[#444] hover:text-red-400 rounded-lg transition-colors disabled:opacity-40">
                  {deleting === activity.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding && (
        <div className="bg-[#0f0f0f] border border-[#00d4ff]/20 rounded-xl p-3 space-y-2">
          <input type="text" className={inputClass} value={newActivity.name}
            onChange={(e) => setNewActivity((s) => ({ ...s, name: e.target.value }))}
            placeholder="Activity name (e.g., Tennis, Running)" autoFocus />
          <DayPicker
            selected={newActivity.daysOfWeek}
            onChange={(days) => setNewActivity((s) => ({ ...s, daysOfWeek: days }))}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={saveNewActivity}
              disabled={saving || !newActivity.name.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#00d4ff] text-black font-semibold text-xs rounded-lg hover:bg-[#33dcff] disabled:opacity-40 transition-colors">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Add
            </button>
            <button onClick={() => { setAdding(false); setNewActivity({ name: "", daysOfWeek: [] }); }}
              className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a2a] text-[#555] text-xs rounded-lg hover:border-[#333] hover:text-white transition-all">
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!adding && (
        <button
          onClick={() => { setAdding(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[#222] text-[#444] rounded-xl hover:border-[#00d4ff]/30 hover:text-[#00d4ff] transition-all text-sm w-full justify-center"
        >
          <Plus className="h-4 w-4" /> Add Activity
        </button>
      )}
    </div>
  );
}
