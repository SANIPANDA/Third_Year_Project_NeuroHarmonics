import { useAuth } from "@/hooks/use-auth";
import { useAnalysisHistory } from "@/hooks/use-analysis";
import { StatCard } from "@/components/stat-card";
import { Activity, Brain, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: history, isLoading } = useAnalysisHistory();

  // Mock data for initial state or empty state
  const mockCurrentState = ["Calm", "Focused", "Stressed"][Math.floor(Math.random() * 3)];
  
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  const recentSessions = history?.slice(0, 5) || [];
  const totalSessions = history?.length || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Welcome back, {user?.username}</h1>
          <p className="text-muted-foreground mt-1">Here's your mental wellness overview for today.</p>
        </div>
        <Link href="/analysis">
          <Button size="lg" className="rounded-full shadow-lg shadow-primary/20">
            <Activity className="mr-2 h-4 w-4" /> Start New Analysis
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <StatCard
          title="Current State"
          value={mockCurrentState}
          icon={<Brain className="w-5 h-5" />}
          description="Based on recent patterns"
          trend="neutral"
          className="border-primary/20 bg-primary/5"
        />
        <StatCard
          title="Total Sessions"
          value={totalSessions}
          icon={<Activity className="w-5 h-5" />}
          description="Lifetime analyses run"
          trend="up"
        />
        <StatCard
          title="Avg. Confidence"
          value={history?.length ? Math.round(history.reduce((acc, curr) => acc + curr.confidence, 0) / history.length) + "%" : "-"}
          icon={<Calendar className="w-5 h-5" />}
          description="Accuracy of readings"
          trend="up"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="col-span-1 border-border/50 shadow-sm h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Analysis History</CardTitle>
            <Link href="/reports">
              <Button variant="link" size="sm" className="h-8 text-primary">View All <ArrowRight className="ml-1 w-3 h-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No sessions yet. Run your first analysis!
              </div>
            ) : (
              <div className="space-y-4">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        session.emotion === 'Stress' ? 'bg-red-500' : 
                        session.emotion === 'Focus' ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm text-foreground">{session.emotion}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(session.createdAt), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-foreground">{session.confidence}%</span>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Confidence</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Tips Card */}
        <Card className="col-span-1 border-border/50 shadow-sm bg-gradient-to-br from-card to-secondary/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Daily Mindfulness Tip</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <blockquote className="border-l-4 border-primary/30 pl-4 py-1 italic text-muted-foreground">
              "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor."
            </blockquote>
            <p className="text-sm font-medium text-right">— Thich Nhat Hanh</p>
            
            <div className="mt-6 p-4 bg-white/50 rounded-xl border border-white/40">
              <h4 className="font-semibold text-sm mb-2 text-primary-foreground bg-primary px-2 py-0.5 rounded-md w-fit">Try This</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Take a deep breath in for 4 seconds, hold for 4 seconds, and exhale slowly for 4 seconds. Repeat 3 times to instantly lower cortisol levels.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
