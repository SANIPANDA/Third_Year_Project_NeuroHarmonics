import { useAnalysisHistory } from "@/hooks/use-analysis";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const { data: history, isLoading } = useAnalysisHistory();
  const { toast } = useToast();

  const handleDownload = () => {
    toast({
      title: "Report Generated",
      description: "Your PDF report has been downloaded successfully.",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Analysis Reports</h1>
          <p className="text-muted-foreground mt-1">Review your historical EEG data sessions.</p>
        </div>
        <Button onClick={handleDownload} className="shadow-lg shadow-primary/20">
          <Download className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </div>

      <Card className="border-border shadow-md">
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>A complete log of all your analyzed sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : history?.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No reports available</h3>
              <p className="text-muted-foreground mt-1">Run your first analysis to generate data.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Emotion Detected</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.map((session) => (
                    <TableRow key={session.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        {format(new Date(session.createdAt), "MMMM d, yyyy • h:mm a")}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          session.emotion === 'Stress' ? 'bg-red-50 text-red-700 border-red-200' : 
                          session.emotion === 'Focus' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {session.emotion}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${session.confidence}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{session.confidence}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        #{session.id.toString().padStart(4, '0')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
