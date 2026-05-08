import { useEffect, useState } from "react";
import { useConfig } from "@/lib/config-store";

export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    void useConfig.persist.rehydrate();
    setM(true);
  }, []);
  return m;
}
