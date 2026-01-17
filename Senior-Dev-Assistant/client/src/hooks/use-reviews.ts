import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertReview } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { insertReviewSchema } from "@shared/schema";

export function useReviews() {
  return useQuery({
    queryKey: [api.reviews.list.path],
    queryFn: async () => {
      const res = await fetch(api.reviews.list.path);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return api.reviews.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<InsertReview, "userId">) => {
      const validated = insertReviewSchema.omit({ userId: true }).parse(data);
      const res = await fetch(api.reviews.create.path, {
        method: api.reviews.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Please login first");
        throw new Error("Failed to submit review");
      }

      return api.reviews.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reviews.list.path] });
      toast({ title: "Thank you!", description: "Your review has been posted." });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: error.message,
      });
    },
  });
}
