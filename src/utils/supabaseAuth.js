import { supabase } from "../config/supabase";

let cachedUser = null;
let cacheAt = 0;
const USER_CACHE_MS = 60_000;

/** Cached user from session — avoids repeated auth.getUser() round-trips. */
export async function getCurrentUser({ force = false } = {}) {
  if (!force && cachedUser && Date.now() - cacheAt < USER_CACHE_MS) {
    return cachedUser;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  cachedUser = session?.user ?? null;
  cacheAt = Date.now();
  return cachedUser;
}

export async function getCurrentUserId(options) {
  const user = await getCurrentUser(options);
  return user?.id ?? null;
}

export function invalidateUserCache() {
  cachedUser = null;
  cacheAt = 0;
}

supabase.auth.onAuthStateChange(() => {
  invalidateUserCache();
});
