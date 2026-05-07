import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meFn, logoutFn } from "./auth.functions";

export function useMe() {
  const fn = useServerFn(meFn);
  return useQuery({
    queryKey: ["me"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });
}

export function useLogout() {
  return useServerFn(logoutFn);
}
