import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                Creative Insights
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
            Unlock the Power of Your{" "}
            <span className="text-blue-600">Ad Creatives</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            Connect your Meta ad accounts and get deep performance insights into
            your creatives. Identify top performers, detect fatigue, and
            optimize your ad spend with data-driven decisions.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
            >
              Start Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">
            Everything you need to optimize your ad creatives
          </h2>
          <p className="mt-4 text-gray-600">
            Powerful analytics designed for ecommerce brands
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6 text-blue-600" />}
            title="Creative Analytics"
            description="See which creatives drive the best ROAS, CTR, and conversions across all your campaigns."
          />
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6 text-green-600" />}
            title="Performance Trends"
            description="Track performance over time and spot trends before they impact your bottom line."
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6 text-yellow-600" />}
            title="Fatigue Detection"
            description="Automatically detect when creatives are losing effectiveness so you can refresh them."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6 text-purple-600" />}
            title="View-Only Access"
            description="We only request read permissions. Your ad accounts stay completely safe and unchanged."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Get started in 3 simple steps
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="Create an Account"
              description="Sign up with your email or Google account. It only takes a few seconds."
            />
            <StepCard
              step="2"
              title="Connect Meta Ads"
              description="Securely connect your Facebook/Meta ad account with view-only permissions."
            />
            <StepCard
              step="3"
              title="Get Insights"
              description="Instantly see creative performance analytics with actionable recommendations."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">
              Creative Insights
            </span>
          </div>
          <p>&copy; {new Date().getFullYear()} Creative Insights. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
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
      <p className="text-sm text-gray-600">{description}</p>
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
      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
