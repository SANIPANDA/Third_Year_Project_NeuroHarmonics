import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Activity, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold">N</div>
          <span className="font-display font-bold text-xl tracking-tight">NeuroHarmonics</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-medium text-muted-foreground hover:text-primary">Log in</Button>
          </Link>
          <Link href="/register">
            <Button className="font-semibold shadow-lg shadow-primary/20">Sign up</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative pt-24 pb-32 overflow-hidden">
          {/* Background Decorative Blobs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl -z-10" />

          <div className="container max-w-5xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              AI-Driven EEG Analysis
            </div>
            
            <h1 className="font-display font-bold text-5xl sm:text-7xl leading-[1.1] text-foreground mb-8 tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
              Find your mental balance with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">NeuroHarmonics</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 fill-mode-both">
              Analyze your emotional state, track your mental well-being, and discover personalized recommendations to improve your focus and calm.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300 fill-mode-both">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:-translate-y-1">
                  Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 transition-all">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-white/50 backdrop-blur-sm border-t border-border/50">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-white to-blue-50/50 border border-white shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-xl">Real-time Analysis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Advanced algorithms process your EEG data instantly to determine your current emotional state.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-white to-teal-50/50 border border-white shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-xl">Smart Insights</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track patterns over time and understand what triggers your stress or enhances your focus.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-white to-indigo-50/50 border border-white shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-xl">Actionable Steps</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get personalized recommendations for mindfulness exercises based on your current state.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} NeuroHarmonics. All rights reserved.
      </footer>
    </div>
  );
}
