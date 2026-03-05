import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  sections: {
    label: string;
    completed: number;
    total: number;
  }[];
}

export function OnboardingProgress({ sections }: OnboardingProgressProps) {
  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const pct = section.total > 0 ? (section.completed / section.total) * 100 : 0;
        return (
          <div key={section.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{section.label}</span>
              <span className="text-gray-500">
                {section.completed}/{section.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct === 100 ? "bg-green-500" : "bg-blue-500"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
