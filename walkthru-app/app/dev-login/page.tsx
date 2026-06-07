"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DevLoginPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await fetch("/api/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    router.push("/test");
  }

  async function logout() {
    await fetch("/api/dev-login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="p-6 font-mono text-sm max-w-sm space-y-4">
      <h1 className="font-bold">Dev Login</h1>
      <p className="text-xs text-gray-500">
        Local dev only — simulates Replit Auth by setting a cookie.
      </p>
      <form onSubmit={login} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          className="border border-gray-300 rounded px-2 py-1 text-xs flex-1"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-3 py-1 bg-gray-900 text-white rounded text-xs disabled:opacity-50"
        >
          Login
        </button>
      </form>
      <button
        onClick={logout}
        className="text-xs text-gray-400 underline"
      >
        Clear session
      </button>
    </div>
  );
}
