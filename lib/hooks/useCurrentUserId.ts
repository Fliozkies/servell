import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";

/**
 * Returns the authenticated user's ID (or null while loading / unauthenticated).
 *
 * Eliminates the repeated `supabase.auth.getUser()` + `setCurrentUserId`
 * pattern that appears in service_detail.tsx, chat.tsx, conversations.tsx,
 * and Profile_page.tsx.
 */
export function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  return userId;
}
