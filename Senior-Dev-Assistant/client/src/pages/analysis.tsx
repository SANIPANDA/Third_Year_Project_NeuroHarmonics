import { useRunAnalysis } from "@/hooks/use-analysis";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Brain, Activity, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

export default function Analysis() {
  const { mutate, isPending, data, reset } = useRunAnalysis();
  const [showResult, setShowResult] = useState(false);
  
  // Custom timer to force spinner to show for at least 2s for UX
  const handleAnalyze = () => {
    setShowResult(false);
    mutate(undefined, {
      onSuccess: () => {
        setTimeout(() => setShowResult(true), 2000); // Artificial delay for effect
      }
    });
  };

  const handleReset = () => {
    setShowResult(false);
    reset();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2 mb-12">
        <h1 className="text-3xl font-display font-bold">EEG Analysis</h1>
        <p className="text-muted-foreground">
          Connect your device or simulate a session to analyze your current brainwaves.
        </p>
      </div>

      <div className="relative min-h-[400px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {!isPending && !showResult && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center w-full"
            >
              <div className="w-64 h-64 mx-auto mb-8 rounded-full bg-gradient-to-tr from-primary/10 to-accent/10 flex items-center justify-center border-4 border-dashed border-primary/20 animate-[spin_10s_linear_infinite]">
                <Brain className="w-24 h-24 text-primary/50" />
              </div>
              <Button 
                size="lg" 
                className="h-16 px-10 text-xl rounded-full shadow-xl shadow-primary/25 hover:shadow-2xl hover:-translate-y-1 transition-all"
                onClick={handleAnalyze}
              >
                Start Analysis
              </Button>
            </motion.div>
          )}

          {isPending && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center w-full"
            >
              <div className="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center">
                <div className="absolute inset-0 border-t-4 border-primary rounded-full animate-spin"></div>
                <div className="absolute inset-4 border-r-4 border-accent rounded-full animate-spin [animation-direction:reverse]"></div>
                <div className="absolute inset-8 border-b-4 border-secondary-foreground rounded-full animate-spin"></div>
                <Activity className="w-16 h-16 text-primary animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-foreground animate-pulse">Processing Signals...</h3>
              <p className="text-muted-foreground mt-2">Please remain still.</p>
            </motion.div>
          )}

          {showResult && data && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <Card className="border-border shadow-2xl overflow-hidden">
                <div className={`h-2 w-full ${
                  data.emotion === 'Stress' ? 'bg-red-500' : 
                  data.emotion === 'Focus' ? 'bg-blue-500' : 'bg-green-500'
                }`} />
                <CardContent className="p-8 text-center space-y-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">Analysis Result</p>
                    <h2 className="text-5xl font-display font-bold text-foreground mb-2">{data.emotion}</h2>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
                      {data.confidence}% Confidence
                    </div>
                  </div>

                  <p className="text-muted-foreground max-w-md mx-auto">
                    {data.emotion === 'Stress' && "We detected elevated beta waves indicating stress. We recommend a breathing exercise."}
                    {data.emotion === 'Calm' && "Your alpha waves are dominant, indicating a relaxed state. Great time for creative work."}
                    {data.emotion === 'Focus' && "High gamma activity detected. You are in a peak flow state."}
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-6">
                    <Link href={`/recommendations?emotion=${data.emotion}`}>
                      <Button variant="default" className="w-full h-12 text-lg shadow-lg shadow-primary/20">
                        See Recommendations
                      </Button>
                    </Link>
                    <Button variant="outline" className="w-full h-12 text-lg" onClick={handleReset}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Run Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
