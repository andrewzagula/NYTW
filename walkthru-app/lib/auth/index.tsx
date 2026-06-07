"use client";

/**
 * Client-side auth boundary.
 *
 * Hydrates from /api/auth/status (Replit headers / dev cookie) and, when GitHub
 * is connected, /api/user/profile for the GH username + avatar. The UI never
 * touches the underlying auth mechanism directly — only this hook.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AuthUser = {
  /** Replit user id (also our internal user id). */
  id: string;
  /** Replit user name. */
  name: string;
  githubUsername: string;
  githubAvatar: string;
};

type AuthState = {
  user: AuthUser | null;
  /** True until the initial /api/auth/status round-trip resolves. */
  loading: boolean;
  /** Replit-authenticated but no GitHub token yet. */
  needsGithub: boolean;
};

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type StatusResponse = {
  replit_authed: boolean;
  github_connected: boolean;
  username: string | null;
};

type ProfileResponse = {
  user: { github_username: string; github_avatar: string } | null;
};

async function loadAuth(): Promise<AuthState> {
  let status: StatusResponse;
  try {
    const r = await fetch("/api/auth/status", { cache: "no-store" });
    status = (await r.json()) as StatusResponse;
  } catch {
    return { user: null, loading: false, needsGithub: false };
  }

  if (!status.replit_authed) {
    return { user: null, loading: false, needsGithub: false };
  }
  if (!status.github_connected) {
    return { user: null, loading: false, needsGithub: true };
  }

  let profile: ProfileResponse = { user: null };
  try {
    const r = await fetch("/api/user/profile", { cache: "no-store" });
    if (r.ok) profile = (await r.json()) as ProfileResponse;
  } catch {
    // non-fatal — fall back to whatever the status route gave us
  }

  // The Replit id isn't surfaced by /api/auth/status (only the name). The
  // server identifies the user from the request headers anyway, so we store an
  // opaque id here — the actual auth check is server-side on every request.
  return {
    user: {
      id: status.username ?? "self",
      name: status.username ?? "you",
      githubUsername: profile.user?.github_username ?? "",
      githubAvatar: profile.user?.github_avatar ?? "",
    },
    loading: false,
    needsGithub: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    needsGithub: false,
  });

  const refresh = useCallback(async () => {
    const next = await loadAuth();
    setState(next);
  }, []);

  useEffect(() => {
    // Initial load. Stay null/loading on first render so SSR + client agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await Promise.all([
        fetch("/api/auth/github/disconnect", { method: "POST" }),
        fetch("/api/dev-login", { method: "DELETE" }),
      ]);
    } catch {
      // ignore — we're tearing the session down anyway
    }
    setState({ user: null, loading: false, needsGithub: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

/** Initials for avatar fallbacks. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
