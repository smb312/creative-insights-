import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Building2,
  CircleSlash,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-semibold text-white tracking-tight font-serif">
                  Brand Pulse
                </span>
                <span className="text-xs font-medium text-slate-400">
                  by Coast
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors"
              >
                Start My Free Brief
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Section 1: Hero */}
      <section className="relative bg-navy pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in-up">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-slate-300 text-sm font-medium tracking-wide mb-8 border border-white/10">
              For ecommerce brands doing $50K+/month
            </span>
          </div>
          <h1 className="animate-fade-in-up-delay-1 text-4xl sm:text-5xl lg:text-6xl font-serif text-white leading-tight tracking-tight">
            Stop Guessing.
            <br />
            Start Your Week With Clarity.
          </h1>
          <p className="animate-fade-in-up-delay-2 mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Brand Pulse connects to your Meta ads and Shopify store, then
            delivers a sharp, personalized performance brief every Monday
            morning. What changed, what&apos;s working, what to do next — in 2
            minutes flat.
          </p>
          <div className="animate-fade-in-up-delay-3 mt-10">
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-4 rounded-lg bg-accent text-white font-semibold text-lg hover:bg-accent-hover transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40"
            >
              Start My Free Brief
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <p className="mt-4 text-sm text-slate-400">
              Takes 2 minutes · Connects to Meta &amp; Shopify · Free forever
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: The Pain */}
      <section className="py-20 sm:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif text-navy">
              Sound familiar?
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            <PainCard text="It's Monday morning and you're dreading the 45 minutes it'll take to figure out what happened in your ad account last week." />
            <PainCard text="You're spending $50K+ a month on Meta but couldn't tell someone your real ROAS if they asked you right now." />
            <PainCard text="Your team sends you dashboards full of numbers, but nobody tells you what any of it actually means — or what to do about it." />
          </div>
          <p className="text-center mt-14 text-xl font-serif text-navy">
            Brand Pulse fixes this.
          </p>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-serif text-navy">
              Three steps. Two minutes. Done.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-16 max-w-5xl mx-auto">
            <StepCard
              step="01"
              title="Tell us about your brand"
              description="A quick profile — your industry, goals, targets, and what you care about. Takes 60 seconds."
            />
            <StepCard
              step="02"
              title="Connect your data"
              description="Link your Meta ad account and Shopify store with one click each. View-only access — we can never modify anything."
            />
            <StepCard
              step="03"
              title="Get your Monday brief"
              description="Every Monday at 6am, you get a personalized brief: what changed, what's working, what to cut, and exactly what to do this week."
            />
          </div>
        </div>
      </section>

      {/* Section 4: What's In Your Brief */}
      <section className="py-20 sm:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-serif text-navy">
              Everything you need to know.
              <br className="hidden sm:block" /> Nothing you don&apos;t.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            <BriefFeatureCard
              emoji="📊"
              title="Weekly Snapshot"
              description="Revenue, ROAS, CPA, CTR — this week vs. last week, with trend arrows. One table, instant clarity."
            />
            <BriefFeatureCard
              emoji="📈"
              title="Monthly Pacing"
              description="Are you on track to hit your revenue goal? How much do you need to average per day for the rest of the month? We do the math."
            />
            <BriefFeatureCard
              emoji="🎯"
              title="Key Callouts"
              description="The 3-5 things that actually matter this week. Your best-performing creator ad. The $5K you're wasting on ads with zero conversions. The fatigue signal on your top ad."
            />
            <BriefFeatureCard
              emoji="⚡"
              title="This Week's Play"
              description="Three specific actions, ranked by impact. Not vague suggestions — concrete moves like 'Kill these 3 ads' or 'Shift $20K to creator content.'"
            />
            <BriefFeatureCard
              emoji="🛍️"
              title="True ROAS (with Shopify)"
              description="Meta says 4.1x. Shopify says 3.2x. We show you both so you know what's real."
            />
            <BriefFeatureCard
              emoji="📅"
              title="Calendar-Aware"
              description="Got a product launch in 10 days? Your brief knows. It'll tell you to start testing creative now, not the day before."
            />
          </div>
          <div className="mt-8 text-center">
            <BriefFeatureCardWide
              emoji="📰"
              title="Marketing Radar"
              description="Three hand-picked articles about what's changing in ecommerce, Meta ads, and creator marketing — so you stay sharp."
            />
          </div>
        </div>
      </section>

      {/* Section 5: Who This Is For */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif text-navy">
              Built for founders who run on data,
              <br className="hidden sm:block" /> not dashboards
            </h2>
          </div>
          <div className="space-y-6 max-w-2xl mx-auto">
            <PersonaCard text="The CEO who wants a Monday morning pulse without sitting through a reporting call." />
            <PersonaCard text="The CMO who needs to know if the team's hitting targets before the standup." />
            <PersonaCard text="The solo founder who's running ads themselves and doesn't have time to analyze everything every week." />
          </div>
          <p className="text-center mt-14 text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            If you&apos;re spending money on Meta ads and selling on Shopify,
            Brand Pulse was built for you.
          </p>
        </div>
      </section>

      {/* Section 6: Trust & Credibility */}
      <section className="py-20 sm:py-24 bg-warm-bg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <TrustCard
              icon={<Lock className="h-6 w-6" />}
              title="View-only access"
              description="We read your data. We never modify your ad account or Shopify store. Ever."
            />
            <TrustCard
              icon={<Building2 className="h-6 w-6" />}
              title="Built by Coast"
              description="We manage millions in ad spend for ecommerce brands. This is the same analysis we give our clients — now free for everyone."
            />
            <TrustCard
              icon={<CircleSlash className="h-6 w-6" />}
              title="No catch. Actually free."
              description="No trial. No credit card. No upsell popup on day 7. Brand Pulse is free because it's how we show you what we can do."
            />
          </div>
        </div>
      </section>

      {/* Section 7: FAQ */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif text-navy">
              Questions
            </h2>
          </div>
          <div className="space-y-0 divide-y divide-slate-200">
            <FAQItem
              question="What do I need to get started?"
              answer="A Meta ad account and/or a Shopify store. The setup takes about 2 minutes."
            />
            <FAQItem
              question="What data do you access?"
              answer="Read-only ad performance metrics from Meta (spend, ROAS, CPA, conversions, creative data) and read-only order data from Shopify (revenue, orders, products). We never modify anything."
            />
            <FAQItem
              question="Is this actually free?"
              answer="Yes. Brand Pulse is built by Coast, a performance marketing agency. It's free because it's how we demonstrate our expertise. There's no premium tier, no trial expiration, no hidden fees."
            />
            <FAQItem
              question="How is this different from Ads Manager or Shopify Analytics?"
              answer="Those show you data. Brand Pulse tells you what it means and what to do about it. In 2 minutes instead of 45."
            />
            <FAQItem
              question="Can I disconnect at any time?"
              answer="Yes. One click in Settings disconnects your accounts and deletes your data."
            />
            <FAQItem
              question="Who's behind this?"
              answer="Coast — a performance marketing agency for ecommerce brands. Learn more at growwithcoast.com."
            />
          </div>
        </div>
      </section>

      {/* Section 8: Final CTA */}
      <section className="relative bg-navy py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--color-navy-light)_0%,_var(--color-navy)_70%)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white leading-tight">
            Your first brief is one Monday away.
          </h2>
          <p className="mt-6 text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
            Connect your accounts today. Get your first Brand Pulse next Monday
            morning.
          </p>
          <div className="mt-10">
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-4 rounded-lg bg-accent text-white font-semibold text-lg hover:bg-accent-hover transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40"
            >
              Start My Free Brief
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <p className="mt-4 text-sm text-slate-400">
              2-minute setup · Meta &amp; Shopify · Free forever
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <span className="font-serif text-base text-navy">Brand Pulse</span>
            <span className="text-xs text-slate-400">by Coast</span>
          </div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <Link
              href="/privacy"
              className="hover:text-navy transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-slate-300">|</span>
            <Link href="/terms" className="hover:text-navy transition-colors">
              Terms of Service
            </Link>
            <span className="text-slate-300">|</span>
            <a
              href="https://growwithcoast.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-navy transition-colors"
            >
              growwithcoast.com
            </a>
          </div>
          <p>&copy; {new Date().getFullYear()} Coast. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Component definitions ─── */

function PainCard({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
      <p className="text-slate-700 leading-relaxed text-base">{text}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <span className="inline-block text-sm font-mono font-semibold text-accent tracking-wider mb-4">
        {step}
      </span>
      <h3 className="text-xl font-semibold text-navy mb-3 font-serif">
        {title}
      </h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function BriefFeatureCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors">
      <span className="text-2xl mb-4 block">{emoji}</span>
      <h3 className="text-lg font-semibold text-navy mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function BriefFeatureCardWide({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="inline-flex items-start gap-4 bg-white rounded-xl border border-slate-200 p-6 text-left max-w-lg mx-auto">
      <span className="text-2xl flex-shrink-0">{emoji}</span>
      <div>
        <h3 className="text-lg font-semibold text-navy mb-1">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function PersonaCard({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-xl bg-warm-bg border border-slate-100">
      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 rounded-full bg-accent" />
      <p className="text-slate-700 leading-relaxed text-base">{text}</p>
    </div>
  );
}

function TrustCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-navy/5 flex items-center justify-center mx-auto mb-4 text-navy">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-navy mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group py-6">
      <summary className="flex items-center justify-between cursor-pointer">
        <h3 className="text-lg font-medium text-navy pr-4">{question}</h3>
        <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-4 text-slate-600 leading-relaxed">{answer}</p>
    </details>
  );
}
