import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useGetWins(player: "p1" | "p2") {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  // Use a deterministic fake principal based on player slot
  // when not authenticated, we use a local fallback
  return useQuery<number>({
    queryKey: ["wins", player, identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return 0;
      try {
        // We use player-specific local principals derived from identity or defaults
        const { Principal } = await import("@icp-sdk/core/principal");
        const principalText = player === "p1" ? "aaaaa-aa" : "2vxsx-fae";
        const principal = Principal.fromText(principalText);
        const wins = await actor.getWins(principal);
        return Number(wins);
      } catch {
        return 0;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 10000,
  });
}

export function useRecordWin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (player: "p1" | "p2") => {
      if (!actor) return;
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        const principalText = player === "p1" ? "aaaaa-aa" : "2vxsx-fae";
        const principal = Principal.fromText(principalText);
        await actor.recordWin(principal);
      } catch {
        // silently fail – local state is source of truth for display
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wins"] });
    },
  });
}
