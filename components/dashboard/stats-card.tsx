import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: "emerald" | "blue" | "orange" | "purple";
}

const colorMap = {
  emerald: { icon: "text-[#00d4ff]", sub: "text-[#00d4ff]" },
  blue: { icon: "text-sky-400", sub: "text-sky-400" },
  orange: { icon: "text-orange-400", sub: "text-orange-400" },
  purple: { icon: "text-violet-400", sub: "text-violet-400" },
};

export function StatsCard({ title, value, subtitle, icon: Icon, color }: StatsCardProps) {
  const colors = colorMap[color];
  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#555] uppercase tracking-wider">{title}</p>
        <Icon className={`h-4 w-4 ${colors.icon}`} />
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      {subtitle && (
        <p className={`text-xs mt-1 ${colors.sub}`}>{subtitle}</p>
      )}
    </div>
  );
}
