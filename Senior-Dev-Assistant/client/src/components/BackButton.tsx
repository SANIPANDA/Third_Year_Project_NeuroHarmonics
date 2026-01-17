import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const [, setLocation] = useLocation();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      onClick={() => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          setLocation("/dashboard");
        }
      }}
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </Button>
  );
}
