"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { format, differenceInCalendarDays, addDays, isPast, isAfter, isBefore } from "date-fns";
import { useRouter } from "next/navigation";

interface MarketingEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string | null;
  adSpendBoost: number | null;
  revenueTarget: number | null;
  notes: string | null;
}

const EVENT_COLORS: Record<string, { bg: string; dot: string; text: string; border: string }> = {
  product_launch: { bg: "bg-purple-50", dot: "bg-purple-500", text: "text-purple-700", border: "border-purple-200" },
  promotion: { bg: "bg-green-50", dot: "bg-green-500", text: "text-green-700", border: "border-green-200" },
  influencer_campaign: { bg: "bg-pink-50", dot: "bg-pink-500", text: "text-pink-700", border: "border-pink-200" },
  seasonal: { bg: "bg-orange-50", dot: "bg-orange-500", text: "text-orange-700", border: "border-orange-200" },
  content_shoot: { bg: "bg-blue-50", dot: "bg-blue-500", text: "text-blue-700", border: "border-blue-200" },
  email_campaign: { bg: "bg-teal-50", dot: "bg-teal-500", text: "text-teal-700", border: "border-teal-200" },
  pr_press: { bg: "bg-yellow-50", dot: "bg-yellow-500", text: "text-yellow-700", border: "border-yellow-200" },
  event: { bg: "bg-red-50", dot: "bg-red-500", text: "text-red-700", border: "border-red-200" },
  other: { bg: "bg-gray-50", dot: "bg-gray-500", text: "text-gray-700", border: "border-gray-200" },
};

const EVENT_LABELS: Record<string, string> = {
  product_launch: "Launch",
  promotion: "Promo",
  influencer_campaign: "Influencer",
  seasonal: "Seasonal",
  content_shoot: "Content",
  email_campaign: "Email",
  pr_press: "PR",
  event: "Event",
  other: "Other",
};

function getRelativeText(startDate: Date): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const diff = differenceInCalendarDays(start, now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0) return `In ${diff}d`;
  return `${Math.abs(diff)}d ago`;
}

export default function MarketingTimeline() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ event: MarketingEvent; x: number; y: number } | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const now = new Date();
      const from = addDays(now, -30);
      const to = addDays(now, 90);
      const res = await fetch(
        `/api/marketing-events?from=${from.toISOString().split("T")[0]}&to=${to.toISOString().split("T")[0]}`
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-scroll to today marker after events load
  useEffect(() => {
    if (!loading && todayRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const todayEl = todayRef.current;
      const containerWidth = container.clientWidth;
      const todayLeft = todayEl.offsetLeft;
      container.scrollLeft = todayLeft - containerWidth / 3;
    }
  }, [loading, events]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const handleEventClick = (event: MarketingEvent, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = scrollRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setTooltip((prev) =>
      prev?.event.id === event.id
        ? null
        : { event, x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top }
    );
  };

  if (loading) {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <CalendarDays className="h-4 w-4" />
          Loading timeline...
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-2">
              <CalendarDays className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Add your key marketing moments to see them here
              </p>
              <p className="text-xs text-gray-500">
                Product launches, sales, campaigns — plan it all.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard/calendar")}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Add Events
          </button>
        </div>
      </div>
    );
  }

  // Build timeline: 30 days back + 90 days forward = 120 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timelineStart = addDays(today, -30);
  const timelineEnd = addDays(today, 90);
  const totalDays = differenceInCalendarDays(timelineEnd, timelineStart);

  // Group months for header
  const months: { label: string; startPx: number; widthPx: number }[] = [];
  const DAY_WIDTH = 14; // px per day
  const TIMELINE_WIDTH = totalDays * DAY_WIDTH;

  let currentMonth = timelineStart.getMonth();
  let monthStartDay = 0;
  for (let d = 0; d <= totalDays; d++) {
    const date = addDays(timelineStart, d);
    if (date.getMonth() !== currentMonth || d === totalDays) {
      months.push({
        label: format(addDays(timelineStart, monthStartDay), "MMM yyyy"),
        startPx: monthStartDay * DAY_WIDTH,
        widthPx: (d - monthStartDay) * DAY_WIDTH,
      });
      currentMonth = date.getMonth();
      monthStartDay = d;
    }
  }

  const todayOffset = differenceInCalendarDays(today, timelineStart) * DAY_WIDTH;

  return (
    <div className="relative mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Marketing Timeline</span>
          <span className="text-xs text-gray-400">Next 90 days</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.push("/dashboard/calendar")}
            className="ml-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Scrollable timeline */}
      <div
        ref={scrollRef}
        className="relative overflow-x-auto scrollbar-thin"
        style={{ cursor: "grab" }}
        onClick={() => setTooltip(null)}
      >
        <div className="relative" style={{ width: TIMELINE_WIDTH, minHeight: 120 }}>
          {/* Month headers */}
          <div className="flex border-b border-gray-100">
            {months.map((m) => (
              <div
                key={m.label}
                className="flex-shrink-0 border-r border-gray-50 px-2 py-1.5 text-xs font-medium text-gray-400"
                style={{ width: m.widthPx }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* TODAY marker */}
          <div
            ref={todayRef}
            className="absolute z-10"
            style={{ left: todayOffset, top: 0, bottom: 0 }}
          >
            <div className="h-full w-px bg-blue-400" />
            <div className="absolute -left-3 top-0.5 rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              TODAY
            </div>
          </div>

          {/* Event nodes */}
          <div className="relative px-2 py-6">
            {events.map((event) => {
              const start = new Date(event.startDate);
              const end = event.endDate ? new Date(event.endDate) : start;
              const colors = EVENT_COLORS[event.eventType] || EVENT_COLORS.other;

              // Position calculation
              const startDay = differenceInCalendarDays(start, timelineStart);
              const endDay = differenceInCalendarDays(end, timelineStart);
              const leftPx = startDay * DAY_WIDTH;
              const isMultiDay = endDay > startDay;
              const widthPx = isMultiDay ? Math.max((endDay - startDay) * DAY_WIDTH, 60) : undefined;

              // Skip if completely outside visible range
              if (endDay < 0 || startDay > totalDays) return null;

              const eventIsPast = isPast(end) && !isBefore(today, end);
              const isWithin7Days = isAfter(start, today) && differenceInCalendarDays(start, today) <= 7;
              const relativeText = getRelativeText(start);

              return (
                <div
                  key={event.id}
                  className="absolute"
                  style={{
                    left: Math.max(leftPx, 0),
                    top: "8px",
                  }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEventClick(event, e); }}
                    className={`
                      group flex flex-col items-start rounded-lg border px-2.5 py-2 transition-all
                      ${colors.bg} ${colors.border}
                      ${eventIsPast ? "opacity-50" : ""}
                      ${isWithin7Days ? "ring-2 ring-blue-300 ring-offset-1" : ""}
                      hover:shadow-md
                    `}
                    style={widthPx ? { width: widthPx, minWidth: 100 } : { minWidth: 100 }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 flex-shrink-0 rounded-full ${colors.dot} ${isWithin7Days && !eventIsPast ? "animate-pulse" : ""}`} />
                      <span className={`text-xs font-semibold ${colors.text} truncate max-w-[100px]`}>
                        {event.title}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-500">
                      <span>{isMultiDay ? `${format(start, "MMM d")}-${format(end, "d")}` : format(start, "MMM d")}</span>
                      <span className={isWithin7Days && !eventIsPast ? "font-semibold text-blue-600" : ""}>
                        {relativeText}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip / Popover */}
      {tooltip && (
        <div
          className="absolute z-30 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
          style={{
            left: Math.min(Math.max(tooltip.x - 136, 8), scrollRef.current ? scrollRef.current.clientWidth - 296 : 200),
            top: tooltip.y + 80,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${(EVENT_COLORS[tooltip.event.eventType] || EVENT_COLORS.other).dot}`} />
                <span className="font-semibold text-gray-900">{tooltip.event.title}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {EVENT_LABELS[tooltip.event.eventType] || "Other"} &mdash;{" "}
                {format(new Date(tooltip.event.startDate), "MMM d, yyyy")}
                {tooltip.event.endDate && ` - ${format(new Date(tooltip.event.endDate), "MMM d, yyyy")}`}
              </p>
            </div>
            <button onClick={() => setTooltip(null)} className="text-gray-400 hover:text-gray-600">
              <span className="text-lg leading-none">&times;</span>
            </button>
          </div>

          {tooltip.event.description && (
            <p className="mt-2 text-sm text-gray-600">{tooltip.event.description}</p>
          )}

          <div className="mt-2 space-y-1">
            {tooltip.event.adSpendBoost != null && (
              <p className="text-xs text-gray-500">
                Ad spend boost: <span className="font-medium text-gray-700">${tooltip.event.adSpendBoost.toLocaleString()}/day</span>
              </p>
            )}
            {tooltip.event.revenueTarget != null && (
              <p className="text-xs text-gray-500">
                Revenue target: <span className="font-medium text-gray-700">${tooltip.event.revenueTarget.toLocaleString()}</span>
              </p>
            )}
            {tooltip.event.notes && (
              <p className="text-xs text-gray-400 italic">{tooltip.event.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
