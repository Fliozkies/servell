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
    let active = true;
    let authEventVersion = 0;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventVersion += 1;
      if (active) setUserId(session?.user.id ?? null);
    });

    const sessionRequestVersion = authEventVersion;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && authEventVersion === sessionRequestVersion) {
        setUserId(session?.user.id ?? null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return userId;
}
