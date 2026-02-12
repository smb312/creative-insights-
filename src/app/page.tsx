import Link from "next/link";
import {
  Mail,
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
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Mail className="h-7 w-7 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                Weekly CMO Brief
              </span>
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
            <Mail className="h-4 w-4" />
            Free for ecommerce founders
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
            Your Weekly CMO Brief
            <span className="text-blue-600"> — Free</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Connect your Meta ad account and get a personalized, AI-powered
            performance brief delivered every Monday morning. Strategic
            insights built for ecommerce founders who want to know
            what&apos;s working — without digging through Ads Manager.
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
              title="Sign up & tell us about your brand"
              description="Quick 2-minute onboarding. Share your brand goals, target customers, and what matters most to you."
            />
            <StepCard
              step="2"
              icon={<Shield className="h-6 w-6 text-blue-600" />}
              title="Connect your Meta ad account"
              description="View-only access. We never modify your campaigns, budgets, or creatives. Your account stays completely safe."
            />
            <StepCard
              step="3"
              icon={<Mail className="h-6 w-6 text-blue-600" />}
              title="Get your personalized brief every Monday"
              description="Wake up to a clear, actionable performance brief in your inbox. Know exactly what to do this week."
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
              Everything a CMO would tell you — delivered for free every Monday
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <BriefFeatureCard
              icon={<BarChart3 className="h-6 w-6 text-blue-600" />}
              title="Weekly performance snapshot"
              description="Key metrics at a glance with week-over-week trends. See exactly how your ads performed without opening Ads Manager."
            />
            <BriefFeatureCard
              icon={<TrendingUp className="h-6 w-6 text-green-600" />}
              title="Top & bottom performing creatives"
              description="Instantly know which creatives are driving results and which ones are draining your budget."
            />
            <BriefFeatureCard
              icon={<Users className="h-6 w-6 text-purple-600" />}
              title="Partnership ad vs brand creative comparison"
              description="Understand how your creator and partnership content stacks up against your in-house creatives."
            />
            <BriefFeatureCard
              icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
              title="Creative fatigue alerts"
              description="Get notified before performance drops. Know exactly when it's time to refresh a creative."
            />
            <BriefFeatureCard
              icon={<Lightbulb className="h-6 w-6 text-orange-600" />}
              title="AI-powered recommendations"
              description="Actionable next steps and strategic recommendations you can implement this week."
            />
            <BriefFeatureCard
              icon={<Target className="h-6 w-6 text-red-600" />}
              title="Personalized to your brand"
              description="Your brief adapts to your brand's goals, industry, and performance history. Not generic — truly yours."
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
                <Users className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Join 500+ ecommerce founders
              </h3>
              <p className="text-sm text-gray-600">
                Trusted by DTC brands and ecommerce teams who want a smarter way
                to understand their ad performance.
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
              answer="Yes, completely free. We believe every ecommerce founder deserves a clear, strategic view of their ad performance. No credit card, no hidden fees, no trial period."
            />
            <FAQItem
              question="What data do you access?"
              answer="We request view-only access to your ad performance metrics — things like impressions, clicks, spend, and conversions. We never access your payment information, personal data, or anything outside of ad reporting."
            />
            <FAQItem
              question="How is this different from Ads Manager?"
              answer="Ads Manager shows you raw data. We interpret that data and give you strategic recommendations — like a CMO reviewing your account every week. We highlight what's working, what's not, and exactly what to do about it."
            />
            <FAQItem
              question="Can I disconnect my account?"
              answer="Absolutely. You can disconnect your Meta ad account at any time with one click from your dashboard. We'll immediately lose access to your data."
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
              Join hundreds of ecommerce founders who start every week knowing
              exactly what&apos;s working in their ad accounts.
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
            <Mail className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">
              Weekly CMO Brief
            </span>
          </div>
          <p>
            &copy; {new Date().getFullYear()} Weekly CMO Brief. All rights
            reserved.
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
