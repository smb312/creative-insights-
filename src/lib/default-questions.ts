/** Default onboarding questions seeded for every new client. */

export interface DefaultQuestion {
  section: "performance" | "creative";
  question_key: string;
  question_text: string;
  order_index: number;
}

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

export const DEFAULT_QUESTIONS: DefaultQuestion[] = [
  ...PERFORMANCE_QUESTIONS.map((text, i) => ({
    section: "performance" as const,
    question_key: `perf_${i + 1}`,
    question_text: text,
    order_index: i + 1,
  })),
  ...CREATIVE_QUESTIONS.map((text, i) => ({
    section: "creative" as const,
    question_key: `creative_${i + 1}`,
    question_text: text,
    order_index: i + 1,
  })),
];
