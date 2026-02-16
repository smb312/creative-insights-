import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  TrendingUp,
  Shield,
  Users,
  Eye,
  ChevronDown,
  Target,
  AlertTriangle,
  Lightbulb,
  UserCheck,
  Lock,
  Newspaper,
  Zap,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Zap className="h-7 w-7 text-blue-600" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-gray-900">
                  Brand Pulse
                </span>
                <span className="text-xs font-medium text-gray-400">
                  by Coast
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                Get My Free Brief
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Free for ecommerce brands
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
            Your Weekly
            <span className="text-blue-600"> Performance Brief</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Connect your Meta ad account. Get a personalized, AI-powered brief
            delivered every Monday morning. Know what&apos;s working, what&apos;s
            not, and exactly what to do next — without digging through Ads
            Manager.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-4 rounded-lg bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
            >
              Get My Free Brief
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            2-minute setup. No credit card required.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From sign-up to your first brief in under 2 minutes
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <StepCard
              step="1"
              icon={<UserCheck className="h-6 w-6 text-blue-600" />}
              title="Tell us about your brand"
              description="Quick onboarding so we can tailor your brief to your business, goals, and challenges."
            />
            <StepCard
              step="2"
              icon={<Shield className="h-6 w-6 text-blue-600" />}
              title="Connect your ad account"
              description="View-only access to your Meta ad data. We never modify anything. Connect in one click."
            />
            <StepCard
              step="3"
              icon={<Zap className="h-6 w-6 text-blue-600" />}
              title="Get your brief every Monday"
              description="AI-powered insights, pacing against your goals, creative performance, and action items — delivered to your inbox."
            />
          </div>
        </div>
      </section>

      {/* What's In Your Brief */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              What&apos;s in your brief
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Everything you need to know — delivered free every Monday
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <BriefFeatureCard
              icon={<BarChart3 className="h-6 w-6 text-blue-600" />}
              title="Weekly performance snapshot"
              description="Key metrics at a glance with week-over-week trends. See exactly how your ads performed without opening Ads Manager."
            />
            <BriefFeatureCard
              icon={<Target className="h-6 w-6 text-green-600" />}
              title="Monthly pacing against your targets"
              description="Track revenue and spend against your goals. Know if you're on track, ahead, or behind — and by how much."
            />
            <BriefFeatureCard
              icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
              title="Top & bottom performing creatives"
              description="Instantly know which creatives are driving results and which ones are draining your budget, with specific callouts."
            />
            <BriefFeatureCard
              icon={<Users className="h-6 w-6 text-orange-600" />}
              title="Partnership vs brand creative comparison"
              description="Understand how your creator and partnership content stacks up against your in-house creatives."
            />
            <BriefFeatureCard
              icon={<Lightbulb className="h-6 w-6 text-yellow-600" />}
              title="3 prioritized action items"
              description="Specific, actionable next steps you can implement this week. No fluff — just what to do."
            />
            <BriefFeatureCard
              icon={<Newspaper className="h-6 w-6 text-red-600" />}
              title="Marketing news radar"
              description="3 relevant industry articles curated for ecommerce founders. Stay sharp without the noise."
            />
          </div>
        </div>
      </section>

      {/* Trust Elements */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Eye className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                View-only access
              </h3>
              <p className="text-sm text-gray-600">
                We never modify your ad account. Read-only permissions mean your
                campaigns, budgets, and creatives are never touched.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Built by Coast
              </h3>
              <p className="text-sm text-gray-600">
                We manage millions in ad spend for ecommerce brands. Brand Pulse
                is built from the insights we deliver to our clients every week.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Lock className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Enterprise-grade security
              </h3>
              <p className="text-sm text-gray-600">
                Your data is encrypted in transit and at rest. We follow
                industry best practices to keep your information safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-0 divide-y divide-gray-200">
            <FAQItem
              question="Is this really free?"
              answer="Yes. Brand Pulse is completely free. We built it because we believe every ecommerce brand deserves a weekly performance brief."
            />
            <FAQItem
              question="What data do you access?"
              answer="View-only access to your ad performance metrics. We can never create, edit, or delete anything in your ad account."
            />
            <FAQItem
              question="Who built this?"
              answer="Brand Pulse is built by Coast, a performance marketing agency for ecommerce brands. Learn more at growwithcoast.com."
            />
            <FAQItem
              question="How is this different from Ads Manager?"
              answer="Ads Manager shows you data. Brand Pulse tells you what it means and what to do about it."
            />
            <FAQItem
              question="Can I disconnect at any time?"
              answer="Yes. One click in your settings and your data is removed."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-2xl px-8 py-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Get your first brief this Monday
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join ecommerce brands who start every week knowing exactly
              what&apos;s working in their ad accounts.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-4 rounded-lg bg-white text-blue-600 font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              Get My Free Brief
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <p className="mt-4 text-sm text-blue-200">
              2-minute setup. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Brand Pulse</span>
            <span className="text-xs text-gray-400">by Coast</span>
          </div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/terms" className="hover:text-gray-700 transition-colors">
              Terms of Service
            </Link>
            <span className="text-gray-300">|</span>
            <a
              href="https://growwithcoast.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 transition-colors"
            >
              growwithcoast.com
            </a>
          </div>
          <p>
            &copy; {new Date().getFullYear()} Coast. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="relative mx-auto mb-6">
        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mx-auto">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
          {step}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function BriefFeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
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
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <h3 className="text-lg font-medium text-gray-900 pr-4">{question}</h3>
        <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-4 text-gray-600 leading-relaxed">{answer}</p>
    </details>
  );
}
