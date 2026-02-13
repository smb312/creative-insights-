"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isAfter } from "date-fns";

// ─── Types & Constants ──────────────────────────────────

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

const EVENT_TYPES: Record<string, { label: string; color: string }> = {
  product_launch: { label: "Product Launch", color: "bg-purple-500" },
  promotion: { label: "Promotion", color: "bg-green-500" },
  influencer_campaign: { label: "Influencer Campaign", color: "bg-pink-500" },
  seasonal: { label: "Seasonal", color: "bg-orange-500" },
  content_shoot: { label: "Content Shoot", color: "bg-blue-500" },
  email_campaign: { label: "Email Campaign", color: "bg-teal-500" },
  pr_press: { label: "PR / Press", color: "bg-yellow-500" },
  event: { label: "Event", color: "bg-red-500" },
  other: { label: "Other", color: "bg-gray-500" },
};

const BADGE_VARIANTS: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  product_launch: "info",
  promotion: "success",
  influencer_campaign: "warning",
  seasonal: "warning",
  content_shoot: "info",
  email_campaign: "default",
  pr_press: "warning",
  event: "danger",
  other: "default",
};

const SUGGESTED_EVENTS = [
  { title: "Valentine's Day", eventType: "seasonal", startDate: "2026-02-14", description: "Valentine's Day promotion — gift sets, limited editions, couples bundles" },
  { title: "Mother's Day", eventType: "seasonal", startDate: "2026-05-11", description: "Mother's Day gift guide and promotion" },
  { title: "Memorial Day Sale", eventType: "promotion", startDate: "2026-05-25", endDate: "2026-05-26", description: "Memorial Day weekend sale event" },
  { title: "Father's Day", eventType: "seasonal", startDate: "2026-06-21", description: "Father's Day gift promotion" },
  { title: "4th of July", eventType: "seasonal", startDate: "2026-07-04", description: "Independence Day sale and themed content" },
  { title: "Back to School", eventType: "promotion", startDate: "2026-08-01", endDate: "2026-08-15", description: "Back-to-school skincare essentials promotion" },
  { title: "Labor Day Sale", eventType: "promotion", startDate: "2026-09-07", description: "Labor Day weekend sale" },
  { title: "Halloween", eventType: "seasonal", startDate: "2026-10-31", description: "Halloween themed content and limited edition products" },
  { title: "Black Friday", eventType: "promotion", startDate: "2026-11-27", endDate: "2026-11-28", description: "Black Friday — biggest sale of the year" },
  { title: "Cyber Monday", eventType: "promotion", startDate: "2026-11-30", description: "Cyber Monday online-exclusive deals" },
  { title: "Christmas", eventType: "seasonal", startDate: "2026-12-25", description: "Christmas gift sets and holiday bundles" },
  { title: "End of Year Sale", eventType: "promotion", startDate: "2026-12-26", endDate: "2026-12-31", description: "End of year clearance and New Year prep" },
];

// ─── Helpers ────────────────────────────────────────────

function formatEventDate(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  if (!endDate) return format(start, "MMM d, yyyy");
  const end = new Date(endDate);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM d")}-${format(end, "d, yyyy")}`;
  }
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

function getRelativeLabel(startDate: string, endDate: string | null): { text: string; isUpcoming: boolean; isPastEvent: boolean } {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  const now = new Date();

  if (isAfter(now, end)) {
    return { text: formatDistanceToNow(end, { addSuffix: true }), isUpcoming: false, isPastEvent: true };
  }
  if (isPast(start)) {
    return { text: "Happening now", isUpcoming: true, isPastEvent: false };
  }
  return { text: `In ${formatDistanceToNow(start)}`, isUpcoming: true, isPastEvent: false };
}

// ─── Empty Form State ───────────────────────────────────

const EMPTY_FORM = {
  title: "",
  eventType: "product_launch",
  startDate: "",
  endDate: "",
  description: "",
  adSpendBoost: "",
  revenueTarget: "",
  notes: "",
  isMultiDay: false,
};

// ─── Component ──────────────────────────────────────────

export default function CalendarPage() {
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing-events");
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

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (event: MarketingEvent) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      eventType: event.eventType,
      startDate: event.startDate.split("T")[0],
      endDate: event.endDate ? event.endDate.split("T")[0] : "",
      description: event.description || "",
      adSpendBoost: event.adSpendBoost != null ? String(event.adSpendBoost) : "",
      revenueTarget: event.revenueTarget != null ? String(event.revenueTarget) : "",
      notes: event.notes || "",
      isMultiDay: !!event.endDate,
    });
    setShowForm(true);
  };

  const prefillSuggested = (suggestion: typeof SUGGESTED_EVENTS[number]) => {
    setEditingId(null);
    setForm({
      title: suggestion.title,
      eventType: suggestion.eventType,
      startDate: suggestion.startDate,
      endDate: "endDate" in suggestion && suggestion.endDate ? suggestion.endDate : "",
      description: suggestion.description || "",
      adSpendBoost: "",
      revenueTarget: "",
      notes: "",
      isMultiDay: !!("endDate" in suggestion && suggestion.endDate),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.eventType || !form.startDate) return;
    setSaving(true);

    try {
      const payload = {
        title: form.title,
        eventType: form.eventType,
        startDate: form.startDate,
        endDate: form.isMultiDay && form.endDate ? form.endDate : null,
        description: form.description || null,
        adSpendBoost: form.adSpendBoost ? Number(form.adSpendBoost) : null,
        revenueTarget: form.revenueTarget ? Number(form.revenueTarget) : null,
        notes: form.notes || null,
      };

      const url = editingId
        ? `/api/marketing-events/${editingId}`
        : "/api/marketing-events";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        await fetchEvents();
      }
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;

    try {
      const res = await fetch(`/api/marketing-events/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchEvents();
      }
    } catch {
      // handle error
    }
  };

  // Sort: upcoming first, then past
  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.endDate || e.startDate) >= now);
  const past = events.filter((e) => new Date(e.endDate || e.startDate) < now);
  const sortedEvents = [...upcoming, ...past];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Plan your key marketing moments — they&apos;ll show up on your dashboard and feed context into your weekly brief.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openAddForm}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Event
        </Button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20 px-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingId ? "Edit Event" : "Add Event"}</CardTitle>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="rounded-md p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Title"
                  id="event-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Spring Collection Launch"
                  required
                />

                <Select
                  label="Event Type"
                  id="event-type"
                  value={form.eventType}
                  onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                >
                  {Object.entries(EVENT_TYPES).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>

                <Input
                  label="Start Date"
                  id="event-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="multi-day"
                    checked={form.isMultiDay}
                    onChange={(e) => setForm({ ...form, isMultiDay: e.target.checked, endDate: e.target.checked ? form.endDate : "" })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="multi-day" className="text-sm text-gray-700">Multi-day event</label>
                </div>

                {form.isMultiDay && (
                  <Input
                    label="End Date"
                    id="event-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                )}

                <div>
                  <label htmlFor="event-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    id="event-desc"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of the event..."
                  />
                </div>

                <Input
                  label="Expected Ad Spend Boost ($/day)"
                  id="event-spend"
                  type="number"
                  value={form.adSpendBoost}
                  onChange={(e) => setForm({ ...form, adSpendBoost: e.target.value })}
                  placeholder="e.g., 500"
                />

                <Input
                  label="Revenue Target ($)"
                  id="event-revenue"
                  type="number"
                  value={form.revenueTarget}
                  onChange={(e) => setForm({ ...form, revenueTarget: e.target.value })}
                  placeholder="e.g., 50000"
                />

                <div>
                  <label htmlFor="event-notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    id="event-notes"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional context..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    loading={saving}
                    onClick={handleSave}
                    disabled={!form.title || !form.startDate}
                  >
                    {editingId ? "Save Changes" : "Add Event"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowForm(false); setEditingId(null); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Events List */}
      {sortedEvents.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {sortedEvents.map((event) => {
                const typeInfo = EVENT_TYPES[event.eventType] || EVENT_TYPES.other;
                const relative = getRelativeLabel(event.startDate, event.endDate);

                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-4 px-6 py-4 ${relative.isPastEvent ? "opacity-60" : ""}`}
                  >
                    {/* Color dot */}
                    <div className={`h-3 w-3 flex-shrink-0 rounded-full ${typeInfo.color}`} />

                    {/* Event details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{event.title}</span>
                        <Badge variant={BADGE_VARIANTS[event.eventType] || "default"}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-sm text-gray-500">
                        <span>{formatEventDate(event.startDate, event.endDate)}</span>
                        <span className={relative.isUpcoming && !relative.isPastEvent ? "font-medium text-blue-600" : ""}>
                          {relative.text}
                        </span>
                      </div>
                      {event.description && (
                        <p className="mt-1 text-sm text-gray-400 truncate">{event.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditForm(event)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Empty State with Suggested Events */
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 rounded-full bg-blue-50 p-4">
                <CalendarDays className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">No events yet</h2>
              <p className="mb-6 max-w-md text-gray-500">
                Add your key marketing moments — product launches, sales, influencer campaigns, and more. They&apos;ll appear on your dashboard timeline and inform your weekly brief.
              </p>
              <Button variant="primary" onClick={openAddForm}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Your First Event
              </Button>
            </CardContent>
          </Card>

          {/* Suggested Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <CardTitle>Suggested Events</CardTitle>
              </div>
              <p className="text-sm text-gray-500">Quick-add common marketing moments for 2026</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTED_EVENTS.map((suggestion) => {
                  const typeInfo = EVENT_TYPES[suggestion.eventType] || EVENT_TYPES.other;
                  return (
                    <button
                      key={suggestion.title}
                      onClick={() => prefillSuggested(suggestion)}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${typeInfo.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900">{suggestion.title}</div>
                        <div className="text-xs text-gray-500">
                          {formatEventDate(suggestion.startDate, "endDate" in suggestion ? suggestion.endDate ?? null : null)}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
