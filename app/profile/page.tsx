"use client";

import { useEffect, useState } from "react";
import { Loader2, Dumbbell, Activity } from "lucide-react";
import { EquipmentManager } from "@/components/profile/equipment-manager";
import { ActivityManager } from "@/components/profile/activity-manager";
import { ActivityRecord } from "@/lib/types";

type ProfileData = {
  availableEquipment: string;
  equipmentItems: string[];
  activities: ActivityRecord[];
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setProfile({
            availableEquipment: data.availableEquipment ?? "none",
            equipmentItems: Array.isArray(data.equipmentItems) ? data.equipmentItems : [],
            activities: Array.isArray(data.activities) ? data.activities : [],
          });
        } else {
          setError("No profile found. Please complete onboarding first.");
        }
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[#00d4ff]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error || "Profile not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-medium text-[#555] uppercase tracking-widest mb-2">Settings</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">Profile</h1>
      </div>

      <div className="space-y-4">
        {/* Equipment Section */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-orange-400" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Equipment</h2>
          </div>
          <EquipmentManager
            initialEquipmentType={profile.availableEquipment}
            initialEquipmentItems={profile.equipmentItems}
          />
        </div>

        {/* Activities Section */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-sky-500/10 rounded-lg flex items-center justify-center">
              <Activity className="h-4 w-4 text-sky-400" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Activities & Sports</h2>
          </div>
          <p className="text-xs text-[#555] mb-5">
            Recurring activities are used to avoid scheduling gym sessions on those days.
          </p>
          <ActivityManager initialActivities={profile.activities} />
        </div>
      </div>
    </div>
  );
}
