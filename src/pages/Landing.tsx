import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, ArrowRight, Activity, Zap,
  TrendingUp, Bell, Search,
  BarChart2, Eye, BrainCircuit, LineChart
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ThemeToggle';
import { useRef } from 'react';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const featuresRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const navItems = [
    { label: 'Features', action: () => scrollTo(featuresRef) },
    { label: 'How It Works', action: () => scrollTo(howItWorksRef) },
    { label: 'Stats', action: () => scrollTo(statsRef) },
    { label: 'Dashboard', action: () => navigate(user ? '/dashboard' : '/auth') },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Announcement Bar */}
      <div className="bg-primary text-primary-foreground py-2.5 px-4 text-center text-sm font-medium tracking-tight">
        <span className="opacity-90">Scheduled Monitoring is now live: Auto-analyze topics every hour with crisis alerts.</span>
        <button onClick={() => navigate(user ? '/dashboard' : '/auth')} className="ml-2 underline underline-offset-2 hover:opacity-80 font-semibold">
          Learn more.
        </button>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-[1280px] px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded overflow-hidden">
              <img src="/logo.png" alt="Sentiment Radar Logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-base font-semibold tracking-tight">Sentiment Radar</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-full px-1.5 py-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full transition-colors hover:bg-card"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />

        <div className="mx-auto max-w-[1280px] px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-joy animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">Live monitoring active</span>
              </div>

              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight text-foreground">
                Real-time
                <br />
                <span className="text-primary">sentiment</span>
                <br />
                intelligence.
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg font-light">
                AI-powered platform that monitors, analyzes, and predicts public opinion across X and YouTube — with six-axis emotion classification.
              </p>
              <div className="mt-10 flex items-center gap-4">
                <button
                  onClick={() => navigate(user ? '/dashboard' : '/auth')}
                  className="rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Start Analyzing
                </button>
                <button
                  onClick={() => navigate(user ? '/dashboard' : '/auth')}
                  className="flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                >
                  View Live Demo
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>

            {/* Hero Visual - Floating Cards */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              {/* Main Card */}
              <div className="relative bg-card border border-border rounded-xl p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-xs font-mono font-medium text-muted-foreground tracking-wider uppercase">Live Analysis</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">AI Regulation</span>
                    <span className="text-xs font-mono text-warning">MIXED</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-success via-warning to-destructive" style={{ width: '72%' }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="rounded-lg bg-secondary/50 p-3 text-center">
                      <p className="text-lg font-semibold font-mono text-foreground">284K</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Volume</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3 text-center">
                      <p className="text-lg font-semibold font-mono text-success">+42%</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Change</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3 text-center">
                      <p className="text-lg font-semibold font-mono text-destructive">72</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Volatility</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating mini card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="absolute -left-12 bottom-8 bg-card border border-border rounded-lg p-3 shadow-lg w-48"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Emotion Detected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground font-medium">Anger</span>
                  <span className="text-xs font-mono text-destructive">38%</span>
                </div>
                <div className="h-1 rounded-full bg-secondary mt-1.5">
                  <div className="h-full rounded-full bg-destructive" style={{ width: '38%' }} />
                </div>
              </motion.div>

              {/* Alert card */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="absolute -right-6 -top-6 bg-card border border-border rounded-lg p-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs font-medium text-foreground">Crisis Alert</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Volatility spike detected on #FoodCrisis</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="border-y border-border py-10 bg-card/50">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '1.2M+', label: 'Posts Analyzed', icon: Activity },
              { value: '24/7', label: 'Real-Time Monitoring', icon: Zap },
              { value: '6', label: 'Emotion Axes', icon: Eye },
              { value: '<2s', label: 'Analysis Latency', icon: TrendingUp },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold font-mono text-foreground tracking-tight">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section ref={featuresRef} className="py-28 scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-20"
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-4">Capabilities</p>
            <h2 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
              Everything you need to understand
              <br />
              <span className="text-primary">public sentiment</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                title: 'Topic Discovery',
                description: 'Search any topic, hashtag, brand, or event. Our AI instantly aggregates data across X and YouTube.',
              },
              {
                icon: BrainCircuit,
                title: 'AI Sentiment Analysis',
                description: 'Advanced NLP models classify sentiment as positive, negative, mixed, or neutral with emotion detection.',
              },
              {
                icon: LineChart,
                title: 'Trend Monitoring',
                description: 'Track sentiment shifts over time with real-time timeline charts showing volume and direction changes.',
              },
              {
                icon: Eye,
                title: 'Emotion Breakdown',
                description: 'Six-axis emotion classification: joy, anger, sadness, fear, surprise, and disgust with precise percentages.',
              },
              {
                icon: Bell,
                title: 'Crisis Alerts',
                description: 'Automated monitoring detects volatility spikes and crisis levels. Get notified before situations escalate.',
              },
              {
                icon: BarChart2,
                title: 'Export Reports',
                description: 'Generate professional CSV and PDF reports with full sentiment data, emotion breakdowns, and AI summaries.',
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group relative bg-card border border-border rounded-xl p-7 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section ref={howItWorksRef} className="py-28 bg-secondary/20 border-y border-border scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-20"
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-4">How It Works</p>
            <h2 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
              Three steps to
              <br />
              <span className="text-primary">actionable insights</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Search',
                description: 'Enter any topic, brand, or event. Our system queries X and YouTube in real-time to gather fresh data.',
              },
              {
                step: '02',
                title: 'Analyze',
                description: 'AI models process each post for sentiment polarity, emotion classification, and crisis-level assessment.',
              },
              {
                step: '03',
                title: 'Act',
                description: 'View interactive dashboards, receive crisis alerts, and export professional reports for stakeholders.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative bg-card border border-border rounded-xl p-8"
              >
                <span className="text-5xl font-serif font-bold text-primary/15">{item.step}</span>
                <h3 className="text-xl font-semibold text-foreground mt-3 tracking-tight">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-3">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-28 scroll-mt-20">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto mb-16"
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-4">Platform Scale</p>
            <h2 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight">
              Built for <span className="text-primary">serious analysis</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '1.2M+', label: 'Posts Analyzed' },
              { value: '24/7', label: 'Real-Time Monitoring' },
              { value: '6', label: 'Emotion Axes' },
              { value: '<2s', label: 'Analysis Latency' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <p className="text-4xl md:text-5xl font-mono font-semibold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-28 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
              Bring real-time sentiment intelligence
              <br />
              to every decision.
            </h2>
            <p className="mt-6 text-primary-foreground/70 text-lg max-w-xl mx-auto">
              Start monitoring public opinion today. No setup required.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                className="rounded-full bg-background text-foreground px-7 py-3.5 text-sm font-semibold hover:bg-background/90 transition-all shadow-lg"
              >
                Get Started Free
              </button>
              <button
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                className="rounded-full border border-primary-foreground/30 px-7 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
              >
                View Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded overflow-hidden">
                  <img src="/logo.png" alt="Sentiment Radar Logo" className="h-full w-full object-cover" />
                </div>
                <span className="text-sm font-semibold tracking-tight">Sentiment Radar</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Real-time sentiment intelligence platform for analysts, researchers, and decision-makers.
              </p>
            </div>
            {[
              {
                title: 'Platform',
                links: [
                  { label: 'Dashboard', action: () => navigate(user ? '/dashboard' : '/auth') },
                  { label: 'Live Feed', action: () => navigate(user ? '/dashboard' : '/auth') },
                  { label: 'Reports', action: () => navigate(user ? '/dashboard' : '/auth') },
                  { label: 'Alerts', action: () => navigate(user ? '/dashboard' : '/auth') },
                ],
              },
              {
                title: 'Resources',
                links: [
                  { label: 'Features', action: () => scrollTo(featuresRef) },
                  { label: 'How It Works', action: () => scrollTo(howItWorksRef) },
                  { label: 'Stats', action: () => scrollTo(statsRef) },
                ],
              },
              {
                title: 'Account',
                links: [
                  { label: user ? 'Dashboard' : 'Sign Up', action: () => navigate(user ? '/dashboard' : '/auth') },
                  { label: user ? 'Profile' : 'Login', action: () => navigate(user ? '/profile' : '/auth') },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <button onClick={link.action} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} Sentiment Radar. All rights reserved.</span>
            <span className="font-mono">v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
