"use client";

type ToolUpdateBadgeProps = {
  tool: string;
  summary: string;
};

export function ToolUpdateBadge({ tool, summary }: ToolUpdateBadgeProps) {
  const config =
    tool === "manage_activities"
      ? { accent: "#09f", label: "Activities updated" }
      : tool === "estimate_food_macros"
        ? { accent: "#00d4ff", label: "Macro estimate" }
        : { accent: "#f97316", label: "Equipment updated" };

  const { accent, label } = config;

  return (
    <div
      className="inline-flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-medium my-1 border"
      style={{
        background: `${accent}10`,
        borderColor: `${accent}30`,
        color: accent,
      }}
    >
      <span
        className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
        style={{ background: accent }}
      />
      <div>
        <span className="font-semibold">{label}: </span>
        <span style={{ color: `${accent}cc` }}>{summary}</span>
      </div>
    </div>
  );
}
