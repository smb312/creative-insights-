import { cn } from "@/lib/utils";

interface SectionProgress {
  section: string;
  total: number;
  completed: number;
}

export function OnboardingProgress({
  sections,
}: {
  sections: SectionProgress[];
}) {
  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const percent =
          section.total > 0
            ? Math.round((section.completed / section.total) * 100)
            : 0;

        return (
          <div key={section.section}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium capitalize text-gray-700">
                {section.section}
              </span>
              <span className="text-gray-500">
                {section.completed}/{section.total}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  percent === 100 ? "bg-green-500" : "bg-blue-500"
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
