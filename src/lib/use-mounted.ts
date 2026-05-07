import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useConfig } from "@/lib/config-store";

export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    void useStore.persist.rehydrate();
    void useConfig.persist.rehydrate();
    setM(true);
  }, []);
  return m;
}
