import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { SiteFooter } from "@/components/landing/site-footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader overHero />
      <main className="flex flex-1 flex-col">
        <Hero />
      </main>
      <SiteFooter minimal />
    </div>
  );
}
