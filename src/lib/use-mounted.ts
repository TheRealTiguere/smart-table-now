import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    void useStore.persist.rehydrate();
    setM(true);
  }, []);
  return m;
}
