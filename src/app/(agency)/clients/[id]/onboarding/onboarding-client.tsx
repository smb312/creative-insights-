"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  upsertOnboardingResponse,
  updatePlatformAccess,
} from "./actions";
import type { Client, PlatformName, PlatformAccessStatus } from "@/lib/types";
import {
  ChevronRight,
  Check,
  ExternalLink,
  Clock,
} from "lucide-react";

// ---------- Question definitions ----------

const PERFORMANCE_QUESTIONS = [
  "How should we prioritize success across your business units (D2C, Loyalty Programs, Subscriptions, Retail, etc.) during this engagement?",
  "If tradeoffs arise, is there a primary business unit we should optimize for, or should we evaluate each independently?",
  "What is the current narrative on paid media this year? Are we achieving goals or falling behind? Please provide as much detail as possible.",
  "What are your short term and/or long term goals moving forward that would define success for this engagement?",
  "What KPIs are most important for us to track? Do you have any specific KPI targets we should aim for?",
  "What is your current monthly budget for the ad platforms we'll be managing?",
  "What is your target monthly budget for those platforms over the next few months/year?",
  "Ideally we would be able to move budget between platforms to maximize performance. Does this work for your team?",
  "In order to help us with ROI calculations, can you speak to product margins?",
  "Are there any industry-specific advertising restrictions that we should be aware of?",
  "Are there inventory constraints for specific product lines that we should be aware of?",
  "Can you touch on key time periods/peak seasons for the business?",
  "What is your main source of truth when assessing paid media performance?",
  "What other tools and platforms are you currently using in your marketing efforts?",
  "What does the current email marketing strategy look like?",
  "Do you have any reporting needs that we should be aware of?",
  "Do you have an in-house dev team or other developer contact you work with?",
  "Do you use a product feed management platform?",
];

const CREATIVE_QUESTIONS = [
  "Who should be our main point of contact for creative approval?",
  "Who is your ideal customer and what are they looking for when coming to your site?",
  "What are the key value propositions of your brand?",
  "Are there any specific dos or don'ts when it comes to advertising?",
  "Are there any brands with an advertising style or personality that you would love to see incorporated into your brand's advertising style?",
  "Who are your top competitors?",
  "Where can we locate your customer reviews?",
  "Where can we locate your press mentions?",
  "Do you have any in-house creative capabilities?",
];

const PLATFORMS: {
  name: PlatformName;
  label: string;
  color: string;
  bgColor: string;
}[] = [
  { name: "meta", label: "Meta", color: "bg-blue-500", bgColor: "bg-blue-50" },
  { name: "google", label: "Google", color: "bg-red-500", bgColor: "bg-red-50" },
  { name: "shopify", label: "Shopify", color: "bg-green-500", bgColor: "bg-green-50" },
  { name: "klaviyo", label: "Klaviyo", color: "bg-purple-500", bgColor: "bg-purple-50" },
  { name: "ga4", label: "GA4", color: "bg-orange-500", bgColor: "bg-orange-50" },
  { name: "tiktok", label: "TikTok", color: "bg-gray-900", bgColor: "bg-gray-50" },
];

const STATUS_COLORS: Record<PlatformAccessStatus, string> = {
  not_started: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-800",
  received: "bg-orange-100 text-orange-800",
  verified: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<PlatformAccessStatus, string> = {
  not_started: "Not Started",
  pending: "Pending",
  received: "Received",
  verified: "Verified",
};

// ---------- Types ----------

interface ResponseRow {
  id: string;
  question_key: string;
  response_text: string | null;
  updated_at: string;
  updated_by: string | null;
  updater?: { full_name: string } | null;
}

interface PlatformRow {
  id: string;
  platform: PlatformName;
  status: PlatformAccessStatus;
  notes: string | null;
  instructions_url: string | null;
  updated_at: string;
  updated_by: string | null;
  updater?: { full_name: string } | null;
}

interface OnboardingClientProps {
  client: Client;
  initialResponses: ResponseRow[];
  initialPlatforms: PlatformRow[];
  hasAssets: boolean;
  userId: string | null;
}

// ---------- Component ----------

export function OnboardingClient({
  client,
  initialResponses,
  initialPlatforms,
  hasAssets,
}: OnboardingClientProps) {
  const [activeTab, setActiveTab] = useState<"questionnaire" | "platforms">(
    "questionnaire"
  );
  const [responses, setResponses] =
    useState<ResponseRow[]>(initialResponses);
  const [platforms, setPlatforms] =
    useState<PlatformRow[]>(initialPlatforms);

  // Build a map of question_key -> response for fast lookup
  const responseMap = new Map<string, ResponseRow>();
  responses.forEach((r) => responseMap.set(r.question_key, r));

  // Counts
  const perfAnswered = PERFORMANCE_QUESTIONS.reduce((n, _, i) => {
    const r = responseMap.get(`perf_${i + 1}`);
    return n + (r?.response_text ? 1 : 0);
  }, 0);
  const creativeAnswered = CREATIVE_QUESTIONS.reduce((n, _, i) => {
    const r = responseMap.get(`creative_${i + 1}`);
    return n + (r?.response_text ? 1 : 0);
  }, 0);
  const totalAnswered = perfAnswered + creativeAnswered;
  const verifiedCount = platforms.filter((p) => p.status === "verified").length;

  // Completion: questions 60%, platforms 25%, assets 15%
  const completion = Math.round(
    (totalAnswered / 27) * 0.6 * 100 +
      (verifiedCount / 6) * 0.25 * 100 +
      (hasAssets ? 1 : 0) * 0.15 * 100
  );

  // Callback to update a single response in local state
  const updateResponseLocal = useCallback(
    (questionKey: string, updated: ResponseRow) => {
      setResponses((prev) => {
        const idx = prev.findIndex((r) => r.question_key === questionKey);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    },
    []
  );

  // Callback to update a platform row
  const updatePlatformLocal = useCallback(
    (id: string, updated: PlatformRow) => {
      setPlatforms((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      );
    },
    []
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-1 flex items-center gap-1 text-sm text-gray-500">
        <Link href="/clients" className="hover:text-gray-700">
          Clients
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/clients/${client.id}/onboarding`}
          className="hover:text-gray-700"
        >
          {client.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900">Onboarding</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Onboarding</h1>

      {/* Completion bar */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Overall Onboarding Completion
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {completion}%
          </span>
        </div>
        <Progress value={completion} />
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span>
            Questions: {totalAnswered}/27
          </span>
          <span>
            Platforms verified: {verifiedCount}/6
          </span>
          <span>
            Assets: {hasAssets ? "Uploaded" : "None yet"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("questionnaire")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "questionnaire"
              ? "border-b-2 border-[#0066FF] text-[#0066FF]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Questionnaire
        </button>
        <button
          onClick={() => setActiveTab("platforms")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "platforms"
              ? "border-b-2 border-[#0066FF] text-[#0066FF]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Platform Access
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "questionnaire" ? (
        <QuestionnaireTab
          clientId={client.id}
          responseMap={responseMap}
          perfAnswered={perfAnswered}
          creativeAnswered={creativeAnswered}
          onResponseUpdate={updateResponseLocal}
        />
      ) : (
        <PlatformAccessTab
          platforms={platforms}
          onPlatformUpdate={updatePlatformLocal}
        />
      )}
    </div>
  );
}

// ---------- Questionnaire Tab ----------

function QuestionnaireTab({
  clientId,
  responseMap,
  perfAnswered,
  creativeAnswered,
  onResponseUpdate,
}: {
  clientId: string;
  responseMap: Map<string, ResponseRow>;
  perfAnswered: number;
  creativeAnswered: number;
  onResponseUpdate: (key: string, row: ResponseRow) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Performance section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
          <Badge variant="secondary">
            {perfAnswered}/{PERFORMANCE_QUESTIONS.length} answered
          </Badge>
        </div>
        <div className="space-y-4">
          {PERFORMANCE_QUESTIONS.map((q, i) => {
            const key = `perf_${i + 1}`;
            const existing = responseMap.get(key);
            return (
              <QuestionCard
                key={key}
                clientId={clientId}
                section="performance"
                questionKey={key}
                questionNumber={i + 1}
                questionText={q}
                existingResponse={existing || null}
                onSaved={(row) => onResponseUpdate(key, row)}
              />
            );
          })}
        </div>
      </section>

      {/* Creative section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Creative</h2>
          <Badge variant="secondary">
            {creativeAnswered}/{CREATIVE_QUESTIONS.length} answered
          </Badge>
        </div>
        <div className="space-y-4">
          {CREATIVE_QUESTIONS.map((q, i) => {
            const key = `creative_${i + 1}`;
            const existing = responseMap.get(key);
            return (
              <QuestionCard
                key={key}
                clientId={clientId}
                section="creative"
                questionKey={key}
                questionNumber={i + 19}
                questionText={q}
                existingResponse={existing || null}
                onSaved={(row) => onResponseUpdate(key, row)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ---------- Question Card ----------

function QuestionCard({
  clientId,
  section,
  questionKey,
  questionNumber,
  questionText,
  existingResponse,
  onSaved,
}: {
  clientId: string;
  section: "performance" | "creative";
  questionKey: string;
  questionNumber: number;
  questionText: string;
  existingResponse: ResponseRow | null;
  onSaved: (row: ResponseRow) => void;
}) {
  const [value, setValue] = useState(existingResponse?.response_text || "");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastMeta, setLastMeta] = useState<{
    name: string | null;
    time: string | null;
  }>({
    name: existingResponse?.updater?.full_name || null,
    time: existingResponse?.updated_at || null,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;

  // Debounced auto-save
  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);
      setSaveStatus("idle");

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        const trimmed = latestValueRef.current;
        setSaveStatus("saving");

        const result = await upsertOnboardingResponse({
          clientId,
          section,
          questionKey,
          questionText,
          responseText: trimmed,
        });

        if (result.error) {
          setSaveStatus("error");
        } else {
          setSaveStatus("saved");
          if (result.data) {
            onSaved(result.data as ResponseRow);
            setLastMeta({
              name: (result.data as ResponseRow).updater?.full_name || null,
              time: (result.data as ResponseRow).updated_at,
            });
          }
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
      }, 1000);
    },
    [clientId, section, questionKey, questionText, onSaved]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isAnswered = !!(existingResponse?.response_text);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="text-sm text-gray-900">
            <span className="mr-2 font-semibold text-gray-400">
              {questionNumber}.
            </span>
            {questionText}
          </p>
          {isAnswered && (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
          )}
        </div>

        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Type your answer..."
          rows={2}
          className="mt-1 w-full resize-y rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0066FF] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
        />

        {/* Footer: save status + last updated */}
        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            {saveStatus === "saving" && <span>Saving...</span>}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-red-500">Failed to save</span>
            )}
          </div>
          {lastMeta.time && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastMeta.name && <span>{lastMeta.name}</span>}
              <span>
                {new Date(lastMeta.time).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Platform Access Tab ----------

function PlatformAccessTab({
  platforms,
  onPlatformUpdate,
}: {
  platforms: PlatformRow[];
  onPlatformUpdate: (id: string, row: PlatformRow) => void;
}) {
  // If no platform rows exist yet, show a message
  if (platforms.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-500">
          No platform access records found. Platform access is configured when
          creating the client.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PLATFORMS.map((meta) => {
        const row = platforms.find((p) => p.platform === meta.name);
        if (!row) return null;
        return (
          <PlatformCard
            key={row.id}
            row={row}
            meta={meta}
            onUpdate={onPlatformUpdate}
          />
        );
      })}
    </div>
  );
}

// ---------- Platform Card ----------

function PlatformCard({
  row,
  meta,
  onUpdate,
}: {
  row: PlatformRow;
  meta: { name: PlatformName; label: string; color: string; bgColor: string };
  onUpdate: (id: string, row: PlatformRow) => void;
}) {
  const [notes, setNotes] = useState(row.notes || "");
  const [instructionsUrl, setInstructionsUrl] = useState(
    row.instructions_url || ""
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState(false);

  async function handleFieldUpdate(
    field: "status" | "notes" | "instructions_url",
    value: string
  ) {
    setSaving(field);
    const result = await updatePlatformAccess({
      id: row.id,
      field,
      value,
    });
    setSaving(null);
    if (!result.error && result.data) {
      onUpdate(row.id, result.data as PlatformRow);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${meta.color}`} />
            <span className="font-semibold text-gray-900">{meta.label}</span>
          </div>
          <Badge
            className={`${STATUS_COLORS[row.status]} border-0 text-xs`}
          >
            {STATUS_LABELS[row.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Status dropdown */}
        <div>
          <Label className="text-xs text-gray-500">Status</Label>
          <Select
            className="mt-1"
            value={row.status}
            onChange={(e) =>
              handleFieldUpdate(
                "status",
                e.target.value
              )
            }
            disabled={saving === "status"}
          >
            <option value="not_started">Not Started</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
            <option value="verified">Verified</option>
          </Select>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-xs text-gray-500">Notes</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== (row.notes || "")) {
                handleFieldUpdate("notes", notes);
              }
            }}
            placeholder="Add notes..."
            rows={2}
            className="mt-1 w-full resize-y rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0066FF] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
          />
        </div>

        {/* Instructions URL */}
        <div>
          <Label className="text-xs text-gray-500">Instructions URL</Label>
          {!editingUrl && instructionsUrl ? (
            <div className="mt-1 flex items-center gap-2">
              <a
                href={instructionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 truncate text-sm text-[#0066FF] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{instructionsUrl}</span>
              </a>
              <button
                onClick={() => setEditingUrl(true)}
                className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
              >
                Edit
              </button>
            </div>
          ) : (
            <Input
              className="mt-1"
              value={instructionsUrl}
              onChange={(e) => setInstructionsUrl(e.target.value)}
              onBlur={() => {
                setEditingUrl(false);
                if (instructionsUrl !== (row.instructions_url || "")) {
                  handleFieldUpdate("instructions_url", instructionsUrl);
                }
              }}
              placeholder="https://..."
            />
          )}
        </div>

        {/* Last updated */}
        {row.updated_at && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {row.updater?.full_name && (
              <span>{row.updater.full_name} &middot;</span>
            )}
            <span>
              {new Date(row.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
