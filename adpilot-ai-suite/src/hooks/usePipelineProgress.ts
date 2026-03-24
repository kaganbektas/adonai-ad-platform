import { useState, useEffect } from "react";
import type { PipelineProgress } from "@/types";

export function usePipelineProgress(analysisId: string | null | undefined) {
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!analysisId) return;

    const token = localStorage.getItem("adonai-token");
    if (!token) return;

    const source = new EventSource(`/api/pipeline/${analysisId}/progress?token=${token}`);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as PipelineProgress;
        setProgress(data);
      } catch {}
    };

    source.addEventListener("completed", () => {
      setIsDone(true);
      source.close();
    });

    source.addEventListener("failed", () => {
      setIsDone(true);
      source.close();
    });

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [analysisId]);

  return { progress, isDone };
}
