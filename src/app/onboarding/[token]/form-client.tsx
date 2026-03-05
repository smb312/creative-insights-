"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { savePublicResponse, markOnboardingComplete } from "./actions";

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

interface Question {
  key: string;
  text: string;
  section: "performance" | "creative";
  sectionLabel: string;
  number: number;
}

const ALL_QUESTIONS: Question[] = [
  ...PERFORMANCE_QUESTIONS.map((text, i) => ({
    key: `perf_${i + 1}`,
    text,
    section: "performance" as const,
    sectionLabel: "Performance",
    number: i + 1,
  })),
  ...CREATIVE_QUESTIONS.map((text, i) => ({
    key: `creative_${i + 1}`,
    text,
    section: "creative" as const,
    sectionLabel: "Creative",
    number: PERFORMANCE_QUESTIONS.length + i + 1,
  })),
];

const TOTAL_QUESTIONS = ALL_QUESTIONS.length;

// ---------- Component ----------

interface OnboardingFormProps {
  clientId: string;
  clientName: string;
  token: string;
  initialResponses: Record<string, string>;
}

export function OnboardingForm({
  clientId,
  clientName,
  initialResponses,
}: OnboardingFormProps) {
  // Find the first unanswered question to start from, or 0 (welcome) if none answered
  const firstUnanswered = ALL_QUESTIONS.findIndex(
    (q) => !initialResponses[q.key]
  );
  const startIndex =
    Object.keys(initialResponses).length === 0
      ? 0 // welcome screen
      : firstUnanswered === -1
        ? TOTAL_QUESTIONS + 1 // all answered, go to completion
        : firstUnanswered + 1; // +1 because index 0 is welcome

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [answers, setAnswers] = useState<Record<string, string>>(
    initialResponses
  );
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Current question (if in question range)
  const isWelcome = currentIndex === 0;
  const isComplete = currentIndex === TOTAL_QUESTIONS + 1;
  const questionIdx = currentIndex - 1; // offset by welcome screen
  const currentQuestion =
    questionIdx >= 0 && questionIdx < TOTAL_QUESTIONS
      ? ALL_QUESTIONS[questionIdx]
      : null;

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.key] || ""
    : "";

  // Progress (0 on welcome, full on complete)
  const progress = isWelcome
    ? 0
    : isComplete
      ? 100
      : Math.round((questionIdx / TOTAL_QUESTIONS) * 100);

  // Focus textarea when question changes
  useEffect(() => {
    if (currentQuestion && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentIndex, currentQuestion]);

  // Save the current answer
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
    [clientId]
  );

  // Go to next question
  const goNext = useCallback(async () => {
    // Save current answer if on a question
    if (currentQuestion && currentAnswer.trim()) {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.key]: currentAnswer,
      }));
      await saveAnswer(currentQuestion.key, currentAnswer);
    }

    setDirection("forward");
    setCurrentIndex((prev) => Math.min(prev + 1, TOTAL_QUESTIONS + 1));
  }, [currentQuestion, currentAnswer, saveAnswer]);

  // Go to previous question
  const goBack = useCallback(() => {
    if (currentIndex <= 0) return;
    setDirection("backward");
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, [currentIndex]);

  // Complete onboarding
  const handleComplete = useCallback(async () => {
    setSaving(true);
    await markOnboardingComplete(clientId);
    setCompleted(true);
    setSaving(false);
  }, [clientId]);

  // Update answer in local state
  const setCurrentAnswer = useCallback(
    (value: string) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
    },
    [currentQuestion]
  );

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        goNext();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        goBack();
      }
      if (e.key === "Backspace" && currentAnswer === "") {
        goBack();
      }
    },
    [goNext, goBack, currentAnswer]
  );

  // ---------- Render ----------

  // Completion screen (after submit)
  if (completed || (isComplete && completed)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="mb-8 text-6xl">&#127881;</div>
          <h1 className="mb-6 text-4xl font-bold text-gray-900">
            You&apos;re all set!
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            Thanks for taking the time to fill this out. The Coast Digital team
            will be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-gray-50">
      {/* Progress bar — thicker with percentage label */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center gap-3 bg-white px-4">
        <div className="h-1 flex-1 rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#0066FF] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {!isWelcome && (
          <span className="text-xs font-medium text-gray-400 tabular-nums whitespace-nowrap py-2">
            {progress}%
          </span>
        )}
      </div>

      {/* Header — fixed with border-bottom */}
      <header className="fixed left-0 right-0 top-[12px] z-40 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        {/* Back button */}
        <button
          onClick={goBack}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 ${
            isWelcome ? "invisible" : ""
          }`}
          aria-label="Go back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Logo — larger, bolder, branded color */}
        <span className="text-2xl font-bold tracking-tight text-[#0066FF]">
          Coast Digital
        </span>

        {/* Question counter + saving indicator */}
        <div className="flex items-center gap-3">
          {currentQuestion && (
            <span className="text-sm font-medium text-gray-400 tabular-nums">
              {currentQuestion.number} / {TOTAL_QUESTIONS}
            </span>
          )}
          <div className="flex h-10 w-10 items-center justify-center">
            {saving && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#0066FF]" />
            )}
          </div>
        </div>
      </header>

      {/* Content area — centered vertically and horizontally */}
      <main className="flex flex-1 items-center justify-center px-6 pt-32 pb-24">
        <div
          key={currentIndex}
          className={`w-full max-w-[640px] ${
            direction === "forward"
              ? "animate-slide-up"
              : "animate-slide-down"
          }`}
        >
          {/* Welcome screen */}
          {isWelcome && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100 sm:p-14">
              <h1 className="mb-6 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
                Welcome, {clientName}{" "}
                <span role="img" aria-label="wave">
                  &#128075;
                </span>
              </h1>
              <p className="mb-3 text-lg text-gray-600 leading-relaxed sm:text-xl">
                We&apos;re so glad to have you on board.
              </p>
              <p className="mb-14 text-lg text-gray-400">
                This should take about 10 minutes.
              </p>
              <button
                onClick={goNext}
                className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#0052cc]"
              >
                Let&apos;s get started
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Question screen */}
          {currentQuestion && (
            <div className="space-y-8">
              {/* Section pill badge */}
              <div>
                <span className="inline-block rounded-full bg-[#0066FF] px-4 py-1.5 text-sm font-semibold text-white">
                  {currentQuestion.sectionLabel}
                </span>
              </div>

              {/* Question text */}
              <h2 className="text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
                {currentQuestion.text}
              </h2>

              {/* Text area — full width */}
              <textarea
                ref={textareaRef}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer here..."
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-5 py-4 text-lg text-gray-900 placeholder:text-gray-300 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all"
              />

              {/* OK button + hint */}
              <div className="flex items-center gap-4">
                <button
                  onClick={goNext}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0066FF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052cc]"
                >
                  OK
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
                <span className="text-xs text-gray-300">
                  or press{" "}
                  <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                    Enter ↵
                  </kbd>
                </span>
              </div>
            </div>
          )}

          {/* Final screen (before submit) */}
          {isComplete && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100 sm:p-14">
              <div className="mb-8 text-6xl">&#127881;</div>
              <h1 className="mb-6 text-4xl font-bold text-gray-900">
                You&apos;re all set!
              </h1>
              <p className="mb-14 text-lg text-gray-500 leading-relaxed">
                Thanks for taking the time to fill this out.
                <br />
                The Coast Digital team will be in touch shortly.
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
