"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  savePublicResponse,
  markOnboardingComplete,
  savePlatformAccess,
  uploadAssetFile,
  removeAssetFile,
} from "./actions";

// ---------- Types ----------

export interface FormQuestion {
  id: string;
  question_key: string;
  question_text: string;
  section: "performance" | "creative";
  order_index: number;
}

interface Question {
  key: string;
  text: string;
  section: "performance" | "creative";
  sectionLabel: string;
  number: number;
}

export interface PlatformAccessData {
  platform: string;
  status: string;
  notes: string | null;
}

interface UploadedFile {
  file_name: string;
  file_size: number;
  file_type: string;
  file_url?: string;
}

// ---------- Constants ----------

const ASSET_CATEGORIES = [
  { key: "brand-guidelines", label: "Brand Guidelines", accept: ".pdf,.doc,.docx,.ppt,.pptx" },
  { key: "logos", label: "Logos", accept: ".png,.svg,.jpg,.jpeg" },
  { key: "raw-video", label: "Raw Video", accept: ".mp4,.mov,.avi,.webm" },
  { key: "ugc-videos", label: "UGC Videos", accept: ".mp4,.mov,.avi,.webm" },
  { key: "product-photography", label: "Product Photography", accept: ".jpg,.jpeg,.png,.webp" },
  { key: "other-documents", label: "Other Documents", accept: "*" },
] as const;

const PLATFORMS = ["meta", "google", "ga4", "shopify", "klaviyo"] as const;

// ---------- Section types ----------

type FlowStep =
  | { type: "welcome" }
  | { type: "transition"; transitionKey: string }
  | { type: "question"; questionIndex: number }
  | { type: "review" }
  | { type: "platform"; platformIndex: number }
  | { type: "assets" }
  | { type: "done" };

// ---------- SVG Icons ----------

function ChartIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="32" width="8" height="12" rx="2" fill="#0066FF" opacity="0.3" />
      <rect x="16" y="22" width="8" height="22" rx="2" fill="#0066FF" opacity="0.5" />
      <rect x="28" y="12" width="8" height="32" rx="2" fill="#0066FF" opacity="0.7" />
      <rect x="40" y="4" width="4" height="40" rx="2" fill="#0066FF" />
    </svg>
  );
}

function PaintbrushIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M36 4L18 22C16 24 16 28 18 30C20 32 24 32 26 30L44 12" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M18 30C16 32 12 34 8 36C6 37 4 40 6 42C8 44 11 42 12 40C14 36 16 32 18 30Z" fill="#0066FF" opacity="0.6" />
      <circle cx="22" cy="26" r="3" fill="#0066FF" opacity="0.3" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="28" r="10" stroke="#0066FF" strokeWidth="2.5" fill="none" />
      <circle cx="16" cy="28" r="4" fill="#0066FF" opacity="0.3" />
      <path d="M24 22L40 6" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 6H40V12" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 14L36 10" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12C4 9.79 5.79 8 8 8H18L22 14H40C42.21 14 44 15.79 44 18V36C44 38.21 42.21 40 40 40H8C5.79 40 4 38.21 4 36V12Z" fill="#0066FF" opacity="0.15" stroke="#0066FF" strokeWidth="2.5" />
      <path d="M14 26L22 26" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 32L30 32" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ---------- Transition screen data ----------

const TRANSITIONS: Record<
  string,
  { icon: React.ReactNode; title: string; subtitle: string; button: string }
> = {
  "before-performance": {
    icon: <ChartIcon />,
    title: "Let\u2019s talk strategy",
    subtitle:
      "A few questions to help us understand your business goals and paid media landscape.",
    button: "Let\u2019s go \u2192",
  },
  "before-creative": {
    icon: <PaintbrushIcon />,
    title: "Now for the creative side",
    subtitle:
      "Help us understand your brand, your customers, and what great advertising looks like for you.",
    button: "Continue \u2192",
  },
  "before-access": {
    icon: <KeyIcon />,
    title: "Almost there \u2014 let\u2019s get access set up",
    subtitle:
      "We\u2019ll walk you through each platform step by step. This usually takes about 5 minutes.",
    button: "Let\u2019s do it \u2192",
  },
  "before-assets": {
    icon: <FolderIcon />,
    title: "One last thing \u2014 your assets",
    subtitle:
      "Share your brand assets so we can hit the ground running.",
    button: "Upload assets \u2192",
  },
};

// ---------- Component ----------

interface OnboardingFormProps {
  clientId: string;
  clientName: string;
  token: string;
  questions: FormQuestion[];
  initialResponses: Record<string, string>;
  initialPlatformAccess: PlatformAccessData[];
  isCompleted?: boolean;
}

export function OnboardingForm({
  clientId,
  clientName,
  questions,
  initialResponses,
  initialPlatformAccess,
  isCompleted = false,
}: OnboardingFormProps) {
  // Build the ordered question list from database questions
  const perfQuestions = useMemo(
    () =>
      questions
        .filter((q) => q.section === "performance")
        .sort((a, b) => a.order_index - b.order_index),
    [questions]
  );
  const creativeQuestions = useMemo(
    () =>
      questions
        .filter((q) => q.section === "creative")
        .sort((a, b) => a.order_index - b.order_index),
    [questions]
  );

  const ALL_QUESTIONS: Question[] = useMemo(() => {
    const ordered = [...perfQuestions, ...creativeQuestions];
    return ordered.map((q, i) => ({
      key: q.question_key,
      text: q.question_text,
      section: q.section,
      sectionLabel: q.section === "performance" ? "Performance" : "Creative",
      number: i + 1,
    }));
  }, [perfQuestions, creativeQuestions]);

  const TOTAL_QUESTIONS = ALL_QUESTIONS.length;
  const PERF_COUNT = perfQuestions.length;

  // Build the flow as a flat array of steps
  const flowSteps: FlowStep[] = useMemo(() => {
    const steps: FlowStep[] = [];

    // 1. Welcome
    steps.push({ type: "welcome" });

    // 2. Transition before performance
    steps.push({ type: "transition", transitionKey: "before-performance" });

    // 3. Performance questions
    for (let i = 0; i < PERF_COUNT; i++) {
      steps.push({ type: "question", questionIndex: i });
    }

    // 4. Transition before creative
    steps.push({ type: "transition", transitionKey: "before-creative" });

    // 5. Creative questions
    for (let i = PERF_COUNT; i < TOTAL_QUESTIONS; i++) {
      steps.push({ type: "question", questionIndex: i });
    }

    // 6. Review screen (before account access)
    steps.push({ type: "review" });

    // 7. Transition before account access
    steps.push({ type: "transition", transitionKey: "before-access" });

    // 8. Platform access screens (5 platforms)
    for (let i = 0; i < PLATFORMS.length; i++) {
      steps.push({ type: "platform", platformIndex: i });
    }

    // 9. Transition before assets
    steps.push({ type: "transition", transitionKey: "before-assets" });

    // 10. Asset upload
    steps.push({ type: "assets" });

    // 11. Done
    steps.push({ type: "done" });

    return steps;
  }, [PERF_COUNT, TOTAL_QUESTIONS]);

  // State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialResponses);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [saving, setSaving] = useState(false);
  const [showCompletedScreen, setShowCompletedScreen] = useState(isCompleted);
  const [reviewMode, setReviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Platform access state
  const [platformData, setPlatformData] = useState<Record<string, { completed: boolean; notes: string; needsHelp: boolean }>>(() => {
    const initial: Record<string, { completed: boolean; notes: string; needsHelp: boolean }> = {};
    for (const p of PLATFORMS) {
      const existing = initialPlatformAccess.find((pa) => pa.platform === p);
      initial[p] = {
        completed: existing?.status === "pending" || existing?.status === "received" || existing?.status === "verified",
        notes: existing?.notes || "",
        needsHelp: existing?.notes?.includes("[NEEDS HELP]") || false,
      };
    }
    return initial;
  });

  // Asset upload state
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile[]>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [activeAssetTab, setActiveAssetTab] = useState<string>(ASSET_CATEGORIES[0].key);

  const currentStep = flowSteps[currentStepIndex];

  // Get current question if on a question step
  const currentQuestion =
    currentStep?.type === "question"
      ? ALL_QUESTIONS[currentStep.questionIndex]
      : null;

  const currentAnswer = currentQuestion ? answers[currentQuestion.key] || "" : "";

  // Focus textarea when question changes
  useEffect(() => {
    if (currentQuestion && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentStepIndex, currentQuestion]);

  // Review step index
  const reviewStepIndex = useMemo(
    () => flowSteps.findIndex((s) => s.type === "review"),
    [flowSteps]
  );

  // ---------- Progress calculation ----------

  const progress = useMemo(() => {
    let completedWeight = 0;

    // Performance questions weight (25%)
    const perfAnswered = ALL_QUESTIONS.filter(
      (q) => q.section === "performance" && answers[q.key]?.trim()
    ).length;
    if (PERF_COUNT > 0) {
      completedWeight += (perfAnswered / PERF_COUNT) * 25;
    } else {
      completedWeight += 25;
    }

    // Creative questions weight (25%)
    const creativeCount = TOTAL_QUESTIONS - PERF_COUNT;
    const creativeAnswered = ALL_QUESTIONS.filter(
      (q) => q.section === "creative" && answers[q.key]?.trim()
    ).length;
    if (creativeCount > 0) {
      completedWeight += (creativeAnswered / creativeCount) * 25;
    } else {
      completedWeight += 25;
    }

    // Account access weight (25%)
    const accessCompleted = PLATFORMS.filter(
      (p) => platformData[p]?.completed || platformData[p]?.notes?.trim()
    ).length;
    completedWeight += (accessCompleted / PLATFORMS.length) * 25;

    // Assets weight (25%)
    const hasAnyAssets = Object.values(uploadedFiles).some((files) => files.length > 0);
    if (hasAnyAssets) completedWeight += 25;

    return Math.round(completedWeight);
  }, [
    ALL_QUESTIONS, answers, PERF_COUNT, TOTAL_QUESTIONS, platformData,
    uploadedFiles,
  ]);

  // Count of answered questions (for display)
  const answeredCount = useMemo(
    () => ALL_QUESTIONS.filter((q) => answers[q.key]?.trim()).length,
    [ALL_QUESTIONS, answers]
  );

  // ---------- Navigation ----------

  const saveAnswer = useCallback(
    async (questionKey: string, value: string) => {
      const q = ALL_QUESTIONS.find((q) => q.key === questionKey);
      if (!q) return;
      setSaving(true);
      await savePublicResponse({
        clientId,
        section: q.section,
        questionKey: q.key,
        questionText: q.text,
        responseText: value,
      });
      setSaving(false);
    },
    [clientId, ALL_QUESTIONS]
  );

  const goNext = useCallback(async () => {
    // Save current answer if on a question and non-empty
    if (currentQuestion && currentAnswer.trim()) {
      setAnswers((prev) => ({ ...prev, [currentQuestion.key]: currentAnswer }));
      await saveAnswer(currentQuestion.key, currentAnswer);
    }
    setDirection("forward");
    setCurrentStepIndex((prev) => Math.min(prev + 1, flowSteps.length - 1));
  }, [currentQuestion, currentAnswer, saveAnswer, flowSteps.length]);

  const goBack = useCallback(() => {
    if (currentStepIndex <= 0) return;
    setDirection("backward");
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, [currentStepIndex]);

  const skipQuestion = useCallback(() => {
    // Advance without saving anything
    setDirection("forward");
    setCurrentStepIndex((prev) => Math.min(prev + 1, flowSteps.length - 1));
  }, [flowSteps.length]);

  const jumpToQuestion = useCallback(
    async (questionIndex: number) => {
      // Save current answer if on a question and non-empty
      if (currentQuestion && currentAnswer.trim()) {
        await saveAnswer(currentQuestion.key, currentAnswer);
      }
      const stepIndex = flowSteps.findIndex(
        (s) => s.type === "question" && s.questionIndex === questionIndex
      );
      if (stepIndex >= 0) {
        setDirection(stepIndex > currentStepIndex ? "forward" : "backward");
        setCurrentStepIndex(stepIndex);
      }
    },
    [flowSteps, currentStepIndex, currentQuestion, currentAnswer, saveAnswer]
  );

  const editFromReview = useCallback(
    (questionIndex: number) => {
      setReviewMode(true);
      const stepIndex = flowSteps.findIndex(
        (s) => s.type === "question" && s.questionIndex === questionIndex
      );
      if (stepIndex >= 0) {
        setDirection("backward");
        setCurrentStepIndex(stepIndex);
      }
    },
    [flowSteps]
  );

  const backToReview = useCallback(async () => {
    // Save current answer if non-empty
    if (currentQuestion && currentAnswer.trim()) {
      setAnswers((prev) => ({ ...prev, [currentQuestion.key]: currentAnswer }));
      await saveAnswer(currentQuestion.key, currentAnswer);
    }
    setReviewMode(false);
    setDirection("forward");
    setCurrentStepIndex(reviewStepIndex);
  }, [currentQuestion, currentAnswer, saveAnswer, reviewStepIndex]);

  const goToReview = useCallback(() => {
    setShowCompletedScreen(false);
    setDirection("backward");
    setCurrentStepIndex(reviewStepIndex);
  }, [reviewStepIndex]);

  const handleComplete = useCallback(async () => {
    setSaving(true);
    await markOnboardingComplete(clientId);
    setShowCompletedScreen(true);
    setSaving(false);
  }, [clientId]);

  const setCurrentAnswer = useCallback(
    (value: string) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
    },
    [currentQuestion]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (reviewMode) {
          backToReview();
        } else {
          goNext();
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (reviewMode) {
          backToReview();
        } else {
          goBack();
        }
      }
      if (e.key === "Backspace" && currentAnswer === "") {
        if (reviewMode) {
          backToReview();
        } else {
          goBack();
        }
      }
    },
    [goNext, goBack, backToReview, reviewMode, currentAnswer]
  );

  // ---------- Platform access save ----------

  const savePlatform = useCallback(
    async (platform: string) => {
      const data = platformData[platform];
      if (!data) return;

      setSaving(true);
      let notes = data.notes;
      if (data.needsHelp) {
        notes = (notes ? notes + " " : "") + "[NEEDS HELP]";
      }
      if (data.completed && !notes) {
        notes = "Completed by client";
      }

      await savePlatformAccess({
        clientId,
        platform,
        status: data.completed || data.notes?.trim() ? "pending" : "not_started",
        notes: notes || "",
      });
      setSaving(false);
    },
    [clientId, platformData]
  );

  const handlePlatformNext = useCallback(async () => {
    if (currentStep?.type === "platform") {
      const platform = PLATFORMS[currentStep.platformIndex];
      await savePlatform(platform);
    }
    goNext();
  }, [currentStep, savePlatform, goNext]);

  const handlePlatformSkip = useCallback(async () => {
    goNext();
  }, [goNext]);

  // ---------- Asset upload ----------

  const handleFileUpload = useCallback(
    async (category: string, files: FileList | null) => {
      if (!files || files.length === 0) return;

      setUploading(true);
      const newFiles: UploadedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${file.name}... (${i + 1}/${files.length})`);

        const formData = new FormData();
        formData.append("clientId", clientId);
        formData.append("category", category);
        formData.append("file", file);

        const result = await uploadAssetFile(formData);
        if (!result.error && result.asset) {
          newFiles.push(result.asset);
        }
      }

      setUploadedFiles((prev) => ({
        ...prev,
        [category]: [...(prev[category] || []), ...newFiles],
      }));
      setUploading(false);
      setUploadProgress(null);
    },
    [clientId]
  );

  const handleRemoveFile = useCallback(
    async (category: string, fileName: string) => {
      await removeAssetFile({ clientId, category, fileName });
      setUploadedFiles((prev) => ({
        ...prev,
        [category]: (prev[category] || []).filter((f) => f.file_name !== fileName),
      }));
    },
    [clientId]
  );

  // ---------- Render helpers ----------

  const renderProgressBar = () => (
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center gap-3 bg-white px-4">
      <div className="h-1 flex-1 rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#0066FF] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {currentStep?.type !== "welcome" && (
        <span className="text-xs font-medium text-gray-400 tabular-nums whitespace-nowrap py-2">
          {answeredCount}/{TOTAL_QUESTIONS} answered
        </span>
      )}
    </div>
  );

  const renderHeader = () => {
    // Determine which question number to display
    let displayQuestionNumber: number | null = null;
    if (currentStep?.type === "question") {
      displayQuestionNumber = ALL_QUESTIONS[currentStep.questionIndex]?.number ?? null;
    }

    return (
      <header className="fixed left-0 right-0 top-[12px] z-40 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <button
          onClick={reviewMode ? backToReview : goBack}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 ${
            currentStepIndex === 0 && !reviewMode ? "invisible" : ""
          }`}
          aria-label={reviewMode ? "Back to review" : "Go back"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-2xl font-bold tracking-tight text-[#0066FF]">
          Coast Digital
        </span>
        <div className="flex items-center gap-3">
          {displayQuestionNumber !== null && (
            <span className="text-sm font-medium text-gray-400 tabular-nums">
              {displayQuestionNumber} / {TOTAL_QUESTIONS}
            </span>
          )}
          <div className="flex h-10 w-10 items-center justify-center">
            {saving && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#0066FF]" />
            )}
          </div>
        </div>
      </header>
    );
  };

  // ---------- Desktop sidebar ----------

  const renderSidebar = () => {
    const isQuestionStep = currentStep?.type === "question" || currentStep?.type === "review";

    return (
      <nav
        className={`hidden md:flex fixed left-0 top-[72px] bottom-0 w-16 flex-col items-center overflow-y-auto py-4 bg-white/90 backdrop-blur-sm border-r border-gray-100 z-30 transition-opacity duration-300 ${
          isQuestionStep ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Performance section */}
        {PERF_COUNT > 0 && (
          <>
            <span className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-gray-300">
              Perf
            </span>
            {ALL_QUESTIONS.filter((q) => q.section === "performance").map((q) => {
              const qIdx = q.number - 1;
              const isAnswered = !!answers[q.key]?.trim();
              const isCurrent =
                currentStep?.type === "question" && currentStep.questionIndex === qIdx;
              return (
                <button
                  key={q.key}
                  onClick={() => jumpToQuestion(qIdx)}
                  className={`group relative my-0.5 flex h-7 w-10 items-center justify-center rounded-md text-xs font-medium transition-all ${
                    isCurrent
                      ? "bg-[#0066FF] text-white shadow-sm"
                      : isAnswered
                      ? "text-[#0066FF] hover:bg-blue-50"
                      : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                  }`}
                  title={`Q${q.number}: ${q.text.slice(0, 60)}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isCurrent
                          ? "bg-white"
                          : isAnswered
                          ? "bg-[#0066FF]"
                          : "border border-gray-300"
                      }`}
                    />
                    {q.number}
                  </span>
                </button>
              );
            })}
          </>
        )}

        {/* Divider */}
        {PERF_COUNT > 0 && TOTAL_QUESTIONS - PERF_COUNT > 0 && (
          <div className="my-2 h-px w-6 bg-gray-200" />
        )}

        {/* Creative section */}
        {TOTAL_QUESTIONS - PERF_COUNT > 0 && (
          <>
            <span className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-gray-300">
              Creative
            </span>
            {ALL_QUESTIONS.filter((q) => q.section === "creative").map((q) => {
              const qIdx = q.number - 1;
              const isAnswered = !!answers[q.key]?.trim();
              const isCurrent =
                currentStep?.type === "question" && currentStep.questionIndex === qIdx;
              return (
                <button
                  key={q.key}
                  onClick={() => jumpToQuestion(qIdx)}
                  className={`group relative my-0.5 flex h-7 w-10 items-center justify-center rounded-md text-xs font-medium transition-all ${
                    isCurrent
                      ? "bg-[#0066FF] text-white shadow-sm"
                      : isAnswered
                      ? "text-[#0066FF] hover:bg-blue-50"
                      : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                  }`}
                  title={`Q${q.number}: ${q.text.slice(0, 60)}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isCurrent
                          ? "bg-white"
                          : isAnswered
                          ? "bg-[#0066FF]"
                          : "border border-gray-300"
                      }`}
                    />
                    {q.number}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </nav>
    );
  };

  // ---------- Mobile bottom navigation ----------

  const renderMobileNav = () => {
    const showNav = currentStep?.type === "question" || currentStep?.type === "review";
    if (!showNav) return null;

    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 flex items-center justify-between gap-3">
        <button
          onClick={reviewMode ? backToReview : goBack}
          disabled={currentStepIndex === 0 && !reviewMode}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        {/* Jump to question dropdown */}
        <select
          value={currentStep?.type === "question" ? currentStep.questionIndex : ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val !== "") jumpToQuestion(Number(val));
          }}
          className="flex-1 max-w-[160px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-600 focus:border-[#0066FF] focus:outline-none focus:ring-1 focus:ring-[#0066FF]/20"
        >
          <option value="" disabled>
            Jump to question...
          </option>
          {ALL_QUESTIONS.map((q) => (
            <option key={q.key} value={q.number - 1}>
              Q{q.number}
              {answers[q.key]?.trim() ? " \u2713" : ""}
            </option>
          ))}
        </select>

        <button
          onClick={goNext}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100"
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  // ---------- Review screen ----------

  const renderReviewScreen = () => {
    const sections: { key: "performance" | "creative"; label: string }[] = [
      { key: "performance", label: "Performance" },
      { key: "creative", label: "Creative" },
    ];

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Review your answers
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Everything looks good? You can edit any answer before continuing.
          </p>
        </div>

        {sections.map(({ key, label }) => {
          const sectionQuestions = ALL_QUESTIONS.filter((q) => q.section === key);
          if (sectionQuestions.length === 0) return null;
          return (
            <div key={key}>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">{label}</h3>
              <div className="space-y-3">
                {sectionQuestions.map((q) => {
                  const answer = answers[q.key]?.trim();
                  return (
                    <div
                      key={q.key}
                      className="flex items-start justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-400">
                          Q{q.number}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-gray-900">
                          {q.text}
                        </p>
                        {answer ? (
                          <p className="mt-1.5 text-sm text-gray-600 whitespace-pre-wrap">
                            {answer}
                          </p>
                        ) : (
                          <p className="mt-1.5 text-sm italic text-gray-400">
                            Skipped
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => editFromReview(q.number - 1)}
                        className="ml-4 flex-shrink-0 text-sm font-medium text-[#0066FF] hover:text-[#0052cc] transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex justify-center pt-4">
          <button
            onClick={goNext}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#0052cc]"
          >
            Looks good, continue &rarr;
          </button>
        </div>
      </div>
    );
  };

  // ---------- Completion screen ----------

  if (showCompletedScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6 animate-slide-up">
          <div className="mb-8 text-6xl">&#127881;</div>
          <h1 className="mb-6 text-4xl font-bold text-gray-900">
            You&apos;re all set!
          </h1>
          <p className="mb-10 text-lg text-gray-500 leading-relaxed">
            Thanks for completing your onboarding. The Coast Digital team will
            review everything and be in touch within 24 hours.
          </p>
          <button
            onClick={goToReview}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#0066FF] shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:ring-gray-300"
          >
            Review or update your answers
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ---------- Main render ----------

  const isQuestionOrReview = currentStep?.type === "question" || currentStep?.type === "review";

  return (
    <div className="relative flex min-h-screen flex-col bg-gray-50">
      {renderProgressBar()}
      {renderHeader()}
      {renderSidebar()}
      {renderMobileNav()}

      <main
        className={`flex flex-1 items-center justify-center px-6 pt-32 pb-24 ${
          isQuestionOrReview ? "md:pl-20" : ""
        } ${currentStep?.type === "question" || currentStep?.type === "review" ? "pb-20 md:pb-24" : ""}`}
      >
        <div
          key={currentStepIndex}
          className={`w-full max-w-[640px] ${
            direction === "forward" ? "animate-slide-up" : "animate-slide-down"
          }`}
        >
          {/* Welcome screen */}
          {currentStep?.type === "welcome" && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100 sm:p-14">
              <h1 className="mb-6 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
                Welcome, {clientName}{" "}
                <span role="img" aria-label="wave">&#128075;</span>
              </h1>
              <p className="mb-3 text-lg text-gray-600 leading-relaxed sm:text-xl">
                We&apos;re so glad to have you on board.
              </p>
              <p className="mb-14 text-lg text-gray-400">
                This should take about 15 minutes.
              </p>
              <button
                onClick={goNext}
                className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#0052cc]"
              >
                Let&apos;s get started
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Section transition screens */}
          {currentStep?.type === "transition" && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100 sm:p-14">
              <div className="mb-8 flex justify-center">
                {TRANSITIONS[currentStep.transitionKey]?.icon}
              </div>
              <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
                {TRANSITIONS[currentStep.transitionKey]?.title}
              </h1>
              <p className="mb-14 text-lg text-gray-500 leading-relaxed">
                {TRANSITIONS[currentStep.transitionKey]?.subtitle}
              </p>
              <button
                onClick={goNext}
                className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#0052cc]"
              >
                {TRANSITIONS[currentStep.transitionKey]?.button}
              </button>
            </div>
          )}

          {/* Question screen */}
          {currentStep?.type === "question" && currentQuestion && (
            <div className="space-y-8">
              <div>
                <span className="inline-block rounded-full bg-[#0066FF] px-4 py-1.5 text-sm font-semibold text-white">
                  {currentQuestion.sectionLabel}
                </span>
              </div>
              <h2 className="text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
                {currentQuestion.text}
              </h2>
              <textarea
                ref={textareaRef}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer here..."
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-5 py-4 text-lg text-gray-900 placeholder:text-gray-300 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all"
              />
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  {reviewMode ? (
                    <button
                      onClick={backToReview}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0066FF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052cc]"
                    >
                      Back to review
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={goNext}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0066FF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052cc]"
                    >
                      OK
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                  <span className="text-xs text-gray-300">
                    or press{" "}
                    <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                      Enter ↵
                    </kbd>
                  </span>
                </div>
                {/* Skip button */}
                {!reviewMode && (
                  <button
                    onClick={skipQuestion}
                    className="self-start text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Skip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Review screen */}
          {currentStep?.type === "review" && renderReviewScreen()}

          {/* Platform access screens */}
          {currentStep?.type === "platform" && (
            <PlatformScreen
              platform={PLATFORMS[currentStep.platformIndex]}
              data={platformData[PLATFORMS[currentStep.platformIndex]]}
              onChange={(updated) =>
                setPlatformData((prev) => ({
                  ...prev,
                  [PLATFORMS[currentStep.platformIndex]]: updated,
                }))
              }
              onNext={handlePlatformNext}
              onSkip={handlePlatformSkip}
              saving={saving}
            />
          )}

          {/* Asset upload screen */}
          {currentStep?.type === "assets" && (
            <AssetUploadScreen
              categories={ASSET_CATEGORIES}
              uploadedFiles={uploadedFiles}
              activeTab={activeAssetTab}
              onTabChange={setActiveAssetTab}
              onUpload={handleFileUpload}
              onRemove={handleRemoveFile}
              uploading={uploading}
              uploadProgress={uploadProgress}
              onNext={goNext}
            />
          )}

          {/* Done screen */}
          {currentStep?.type === "done" && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100 sm:p-14">
              <div className="mb-8 text-6xl">&#127881;</div>
              <h1 className="mb-6 text-4xl font-bold text-gray-900">
                You&apos;re all set!
              </h1>
              <p className="mb-14 text-lg text-gray-500 leading-relaxed">
                Thanks for completing your onboarding. The Coast Digital team
                will review everything and be in touch within 24 hours.
              </p>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#0052cc] disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// Platform Access Screens
// ============================================================

interface PlatformScreenProps {
  platform: string;
  data: { completed: boolean; notes: string; needsHelp: boolean };
  onChange: (data: { completed: boolean; notes: string; needsHelp: boolean }) => void;
  onNext: () => void;
  onSkip: () => void;
  saving: boolean;
}

function PlatformScreen({ platform, data, onChange, onNext, onSkip, saving }: PlatformScreenProps) {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) return null;

  return (
    <div className="space-y-8">
      <div>
        <span className="inline-block rounded-full bg-gray-100 px-4 py-1.5 text-sm font-semibold text-gray-600">
          Account Access
        </span>
      </div>

      <h2 className="text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
        {config.headline}
      </h2>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <ol className="list-decimal list-inside space-y-3 text-gray-600 leading-relaxed">
          {config.steps.map((step, i) => (
            <li key={i} className="text-base">
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Platform-specific inputs */}
      <div className="space-y-4">
        {config.inputType === "checkbox" && (
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={data.completed}
              onChange={(e) => onChange({ ...data, completed: e.target.checked })}
              className="mt-0.5 h-5 w-5 rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF]/20 cursor-pointer"
            />
            <span className="text-base text-gray-700 group-hover:text-gray-900 transition-colors">
              {config.checkboxLabel}
            </span>
          </label>
        )}

        {config.inputType === "text" && (
          <input
            type="text"
            value={data.notes}
            onChange={(e) => onChange({ ...data, notes: e.target.value })}
            placeholder={config.inputPlaceholder}
            className="w-full rounded-xl border border-gray-200 bg-white px-5 py-4 text-lg text-gray-900 placeholder:text-gray-300 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all"
          />
        )}

        {config.inputType === "text-and-checkbox" && (
          <>
            <input
              type="text"
              value={data.notes}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              placeholder={config.inputPlaceholder}
              className="w-full rounded-xl border border-gray-200 bg-white px-5 py-4 text-lg text-gray-900 placeholder:text-gray-300 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all"
            />
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={data.needsHelp}
                onChange={(e) => onChange({ ...data, needsHelp: e.target.checked })}
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF]/20 cursor-pointer"
              />
              <span className="text-base text-gray-700 group-hover:text-gray-900 transition-colors">
                I need help with this step
              </span>
            </label>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onNext}
          disabled={saving}
          className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#0052cc] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Done, next \u2192"}
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ---------- Platform configs ----------

const PLATFORM_CONFIGS: Record<
  string,
  {
    headline: string;
    steps: (string | React.ReactNode)[];
    inputType: "checkbox" | "text" | "text-and-checkbox";
    checkboxLabel?: string;
    inputPlaceholder?: string;
  }
> = {
  meta: {
    headline: "Grant access to Meta Ads",
    steps: [
      "Navigate to Business Settings in Meta Business Manager",
      'Go to Partners \u2192 click Add \u2192 click "Give a partner access to your assets"',
      "Input Coast Digital\u2019s Business ID: 256987984996672",
      'Grant "Manage campaigns" access to your Ad Account',
    ],
    inputType: "checkbox",
    checkboxLabel: "I\u2019ve completed these steps",
  },
  google: {
    headline: "Share your Google Ads Customer ID",
    steps: [
      "Log into Google Ads",
      "Find your 10-digit Customer ID at the top of the screen (format: XXX-XXX-XXXX)",
      "Paste it below \u2014 we\u2019ll send you an invitation to link accounts",
    ],
    inputType: "text",
    inputPlaceholder: "Your Customer ID (XXX-XXX-XXXX)",
  },
  ga4: {
    headline: "Add us to Google Analytics",
    steps: [
      "Go to Google Analytics \u2192 Admin \u2192 Account Access Management",
      "Click the + button to add users",
      "Add both emails with Edit access: sean@growwithcoast.com and scott@growwithcoast.com",
    ],
    inputType: "checkbox",
    checkboxLabel: "I\u2019ve added both emails",
  },
  shopify: {
    headline: "Add us to your website platform",
    steps: [
      "Let us know what platform you use below",
      "Add the following as Admin users: sean@growwithcoast.com and scott@growwithcoast.com",
      "If you need help with this step, just check the box and we\u2019ll reach out",
    ],
    inputType: "text-and-checkbox",
    inputPlaceholder: "What platform do you use? (Shopify, WooCommerce, etc.)",
  },
  klaviyo: {
    headline: "Add us to your email marketing platform",
    steps: [
      "Let us know what platform you use below",
      "Add the following as Admin users: sean@growwithcoast.com and scott@growwithcoast.com",
      "If you need help, just check the box and we\u2019ll reach out",
    ],
    inputType: "text-and-checkbox",
    inputPlaceholder: "What email platform do you use? (Klaviyo, Mailchimp, etc.)",
  },
};

// ============================================================
// Asset Upload Screen
// ============================================================

interface AssetUploadScreenProps {
  categories: readonly { key: string; label: string; accept: string }[];
  uploadedFiles: Record<string, UploadedFile[]>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUpload: (category: string, files: FileList | null) => void;
  onRemove: (category: string, fileName: string) => void;
  uploading: boolean;
  uploadProgress: string | null;
  onNext: () => void;
}

function AssetUploadScreen({
  categories,
  uploadedFiles,
  activeTab,
  onTabChange,
  onUpload,
  onRemove,
  uploading,
  uploadProgress,
  onNext,
}: AssetUploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCategory = categories.find((c) => c.key === activeTab)!;
  const files = uploadedFiles[activeTab] || [];

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onUpload(activeTab, e.dataTransfer.files);
    },
    [activeTab, onUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const totalUploaded = Object.values(uploadedFiles).reduce(
    (sum, files) => sum + files.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-block rounded-full bg-gray-100 px-4 py-1.5 text-sm font-semibold text-gray-600">
          Brand Assets
        </span>
      </div>

      <h2 className="text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
        Upload your assets
      </h2>
      <p className="text-gray-500">
        Share your brand files so we can hit the ground running. All uploads are optional.
      </p>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = (uploadedFiles[cat.key] || []).length;
          return (
            <button
              key={cat.key}
              onClick={() => onTabChange(cat.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === cat.key
                  ? "bg-[#0066FF] text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300"
              }`}
            >
              {cat.label}
              {count > 0 && (
                <span className={`ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                  activeTab === cat.key ? "bg-white/20 text-white" : "bg-[#0066FF]/10 text-[#0066FF]"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 transition-colors hover:border-[#0066FF]/30"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="mb-2 text-base text-gray-500">
          Drag & drop files here
        </p>
        <p className="mb-4 text-sm text-gray-400">or</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-[#0066FF] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0052cc] disabled:opacity-50"
        >
          Browse files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={activeCategory.accept}
          onChange={(e) => onUpload(activeTab, e.target.files)}
          className="hidden"
        />
      </div>

      {/* Upload progress */}
      {uploadProgress && (
        <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-[#0066FF]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-[#0066FF]" />
          {uploadProgress}
        </div>
      )}

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.file_name}
              className="flex items-center justify-between rounded-lg bg-white px-4 py-3 ring-1 ring-gray-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate text-sm text-gray-700">{file.file_name}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatFileSize(file.file_size)}
                </span>
              </div>
              <button
                onClick={() => onRemove(activeTab, file.file_name)}
                className="ml-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label="Remove file"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary + continue */}
      <div className="flex flex-col items-center gap-3 pt-4">
        {totalUploaded > 0 && (
          <p className="text-sm text-gray-500">
            {totalUploaded} file{totalUploaded !== 1 ? "s" : ""} uploaded
          </p>
        )}
        <button
          onClick={onNext}
          disabled={uploading}
          className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#0052cc] disabled:opacity-50"
        >
          Continue &rarr;
        </button>
        {totalUploaded === 0 && (
          <p className="text-xs text-gray-400">Assets are optional — you can skip this step</p>
        )}
      </div>
    </div>
  );
}
