import { COMPETITIONS } from "@/lib/competitions";
import HomeGrid from "@/components/HomeGrid";

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-fg">Footy Scenarios</h1>
        <p className="text-sm text-muted">Pick a competition to simulate.</p>
      </header>
      <HomeGrid competitions={COMPETITIONS} />
    </main>
  );
}
