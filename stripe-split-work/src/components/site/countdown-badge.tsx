import { useEffect, useState } from "react";

// TODO(backend): drive this end date from your admin panel / database
// (e.g. a `campaigns` table with a `promo_ends_at` field) instead of a
// hard-coded constant, so marketing can extend or end the offer without a
// code deploy.
const STORAGE_KEY = "jasper-launch-offer-ends-at";
const CAMPAIGN_DURATION_MS = 4 * 24 * 60 * 60 * 1000; // 4 days from first visit

function getEndTime(): number {
  if (typeof window === "undefined") return Date.now() + CAMPAIGN_DURATION_MS;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const t = parseInt(stored, 10);
    if (!Number.isNaN(t) && t > Date.now()) return t;
  }
  const end = Date.now() + CAMPAIGN_DURATION_MS;
  window.localStorage.setItem(STORAGE_KEY, String(end));
  return end;
}

function format(msLeft: number) {
  const totalSec = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function CountdownBadge() {
  const [endTime] = useState(getEndTime);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msLeft = endTime - now;
  if (msLeft <= 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-white border border-ink/10 px-3 py-1.5 text-xs font-semibold">
        <span className="h-2 w-2 rounded-full bg-mint" />
        Livraison France offerte
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-ink/10 px-3 py-1.5 text-xs font-semibold">
      <span className="h-2 w-2 rounded-full bg-mint animate-pulse" />
      Offre de lancement · code <span className="text-primary">BIENVENUE10</span>
      <span className="text-muted-foreground font-normal">· se termine dans {format(msLeft)}</span>
    </div>
  );
}
