import { useReviews, useCreateReview } from "@/hooks/use-reviews";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReviewSchema, type InsertReview } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Loader2, MessageSquare } from "lucide-react";

export default function Reviews() {
  const { data: reviews, isLoading } = useReviews();
  const createReview = useCreateReview();

  const form = useForm<Omit<InsertReview, "userId">>({
    resolver: zodResolver(insertReviewSchema.omit({ userId: true })),
    defaultValues: {
      rating: 5,
      comment: "",
    },
  });

  const onSubmit = (data: Omit<InsertReview, "userId">) => {
    createReview.mutate(data, {
      onSuccess: () => form.reset(),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-display font-bold">Community Feedback</h1>
        <p className="text-muted-foreground">See what others are saying about NeuroHarmonics.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Review Form */}
        <div className="md:col-span-1">
          <Card className="sticky top-24 border-border shadow-lg">
            <CardHeader>
              <CardTitle>Write a Review</CardTitle>
              <CardDescription>Share your experience with us.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating</FormLabel>
                        <div className="flex gap-1 py-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => field.onChange(star)}
                              className={`transition-colors ${
                                star <= field.value ? "text-yellow-400 fill-yellow-400" : "text-muted stroke-muted-foreground"
                              }`}
                            >
                              <Star className={`w-6 h-6 ${star <= field.value ? "fill-current" : ""}`} />
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comment</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about your experience..." 
                            className="min-h-[120px] resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createReview.isPending}>
                    {createReview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Post Review
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <div className="md:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : reviews?.length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No reviews yet. Be the first!</p>
            </div>
          ) : (
            reviews?.map((review) => (
              <div 
                key={review.id} 
                className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${review.username}`} />
                      <AvatarFallback>{review.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{review.username}</p>
                      <div className="flex text-yellow-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-current" : "text-muted"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                    Verified User
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  "{review.comment}"
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
