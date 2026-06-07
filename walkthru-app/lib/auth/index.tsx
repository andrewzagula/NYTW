"use client";

/**
 * Stub auth boundary.
 *
 * Everything the UI needs goes through `useAuth()`. The implementation here is
 * a localStorage-backed stub for the mocked first pass — no real OAuth. When
 * real auth (Replit / GitHub / Google) lands, only this module changes; the
 * screens keep calling the same hook.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AuthProvider = "github" | "google" | "email";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  /** GitHub sign-ins are connected immediately; google/email need a connect step. */
  githubConnected: boolean;
};

const STORAGE_KEY = "walkthru.auth";

function readStored(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeStored(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(STORAGE_KEY);
}

function nameFromEmail(email: string): string {
  const handle = email.split("@")[0] ?? "developer";
  return handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// The demo identity the stub "signs in" as.
function makeUser(provider: AuthProvider, email?: string): AuthUser {
  if (provider === "github") {
    return {
      id: "u_demo",
      name: "Andrew Zagula",
      email: "andrew@walkthru.dev",
      avatarUrl: "",
      githubConnected: true,
    };
  }
  const resolvedEmail = email?.trim() || "you@walkthru.dev";
  return {
    id: "u_demo",
    name: nameFromEmail(resolvedEmail),
    email: resolvedEmail,
    avatarUrl: "",
    githubConnected: false,
  };
}

type AuthContextValue = {
  user: AuthUser | null;
  /** true until the stored session has been read on the client */
  loading: boolean;
  signIn: (provider: AuthProvider, email?: string) => AuthUser;
  connectGithub: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthState = { user: AuthUser | null; loading: boolean };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    // Hydrate the stub session from localStorage once after mount. The initial
    // render stays null (loading: true) on both server and client, which avoids
    // a hydration mismatch — the documented localStorage-on-mount pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ user: readStored(), loading: false });
  }, []);

  const signIn = useCallback((provider: AuthProvider, email?: string) => {
    const next = makeUser(provider, email);
    writeStored(next);
    setState({ user: next, loading: false });
    return next;
  }, []);

  const connectGithub = useCallback(() => {
    setState((prev) => {
      const next: AuthUser = prev.user
        ? { ...prev.user, githubConnected: true }
        : makeUser("github");
      writeStored(next);
      return { user: next, loading: false };
    });
  }, []);

  const signOut = useCallback(() => {
    writeStored(null);
    setState({ user: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        loading: state.loading,
        signIn,
        connectGithub,
        signOut,
      }}
    >
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
