import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 text-destructive items-center justify-center">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">404 Page Not Found</h1>
          <p className="text-center text-muted-foreground mb-6">
            The page you are looking for does not exist or has been moved.
          </p>

          <div className="flex justify-center">
             <Link href="/">
              <Button size="lg" className="w-full sm:w-auto">Return Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
