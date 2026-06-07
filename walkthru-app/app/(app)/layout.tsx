"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, LogOut } from "lucide-react";
import { useAuth, initials } from "@/lib/auth";
import { Logo } from "@/components/shared/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/signin");
    else if (!user.githubConnected) router.replace("/connect-github");
  }, [loading, user, router]);

  if (loading || !user || !user.githubConnected) return <FullScreenLoader />;

  function handleSignOut() {
    signOut();
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo href="/dashboard" />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-vermillion text-xs font-medium text-hero-ink">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                {user.name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {children}
    </div>
  );
}
