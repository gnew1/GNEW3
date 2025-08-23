import { useEffect, useState } from "react";
import type { Survey } from "./types";

type EligibleResp = { eligible: boolean; survey?: Survey };

export function useSurveyTrigger(event: string, userId: string, endpoint = "/feedback") {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch(`${endpoint}/eligible?user_id=${encodeURIComponent(userId)}&event=${encodeURIComponent(event)}&locale=en`);
        const data: EligibleResp = await res.json();
        if (!cancelled && data.eligible && data.survey) {
          setSurvey(data.survey);
          setOpen(true);
        }
      } catch { /* noop */ }
    }
    run();
    return () => { cancelled = true; };
  }, [event, userId, endpoint]);
  return { survey, open, setOpen };
}

