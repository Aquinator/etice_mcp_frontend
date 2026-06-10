"use client";
import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  delay?: number;
  iconBg: string;   // cor inline para o fundo do ícone
  iconColor: string;
}

export default function StatCard({ label, value, sub, icon: Icon, delay = 0, iconBg, iconColor }: Props) {
  return (
    <div
      className="glass stat-card anim-fade-up rounded-2xl p-6 flex flex-col gap-4 cursor-default"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <span style={{ fontSize: ".65rem", letterSpacing: ".2em", color: "rgba(255,255,255,.4)", textTransform: "uppercase", fontWeight: 500 }}>
          {label}
        </span>
        <div style={{ padding: ".5rem", borderRadius: ".75rem", background: iconBg }}>
          <Icon size={16} color={iconColor} strokeWidth={1.5} />
        </div>
      </div>
      <div>
        <p className="stat-value">{value}</p>
        {sub && <p style={{ fontSize: ".75rem", color: "rgba(255,255,255,.3)", marginTop: ".5rem" }}>{sub}</p>}
      </div>
    </div>
  );
}