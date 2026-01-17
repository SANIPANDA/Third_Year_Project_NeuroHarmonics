import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useRecommendations(emotion: string) {
  return useQuery({
    queryKey: [api.recommendations.list.path, emotion],
    queryFn: async () => {
      const url = buildUrl(api.recommendations.list.path, { emotion });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return api.recommendations.list.responses[200].parse(await res.json());
    },
    enabled: !!emotion,
  });
}
