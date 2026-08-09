import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { EDITIONS } from "@/components/site/editions";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";
import sceneBedroom from "@/assets/scene-bedroom.jpg";
import sceneGrandma from "@/assets/scene-grandma.jpg";

const THEME_STYLES: Record<string, { bg: string; accent: string; ring: string }> = {
  kids: { bg: "from-blush/50 via-mint-soft/40 to-white", accent: "bg-blush text-ink", ring: "ring-blush" },
  "grand-air": { bg: "from-sky/50 via-white to-mint-soft/40", accent: "bg-sky text-ink", ring: "ring-sky" },
  perchoir: { bg: "from-accent/30 via-white to-cream", accent: "bg-accent text-ink", ring: "ring-accent" },
};

/** Small hand-drawn flat illustration for the "Grand Air" (adults/seniors) edition. */
function GrandAirIllustration() {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="200" rx="28" fill="var(--sky)" opacity="0.35" />
      <circle cx="252" cy="46" r="22" fill="var(--secondary)" opacity="0.55" />
      <path d="M0 150 L60 96 L110 138 L170 76 L230 132 L320 90 L320 200 L0 200 Z" fill="var(--ink)" opacity="0.08" />
      <path d="M0 168 L70 118 L130 156 L200 104 L260 150 L320 118 L320 200 L0 200 Z" fill="var(--ink)" opacity="0.14" />
      <g opacity="0.6">
        <path d="M40 60 q18 -22 36 0" stroke="var(--card)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M70 44 q18 -22 36 0" stroke="var(--card)" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
      <g transform="translate(150 40) rotate(18)">
        <path d="M0 10 L46 0 L60 6 L46 12 Z" fill="var(--ink)" opacity="0.7" />
        <path d="M14 6 L4 -6 L12 -6 L24 4 Z" fill="var(--ink)" opacity="0.5" />
      </g>
    </svg>
  );
}

/** Small hand-drawn illustration for the "Perchoir" (pets) edition: a wall-mounted perch. */
function PerchoirIllustration() {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="200" rx="28" fill="var(--accent)" opacity="0.18" />
      <rect x="30" y="34" width="120" height="8" rx="4" fill="var(--ink)" opacity="0.35" />
      <path d="M90 42 q0 40 0 56" stroke="var(--ink)" strokeWidth="3" opacity="0.4" strokeDasharray="2 6" strokeLinecap="round" />
      <circle cx="90" cy="122" r="34" fill="var(--card)" stroke="var(--ink)" strokeOpacity="0.12" strokeWidth="2" />
      <circle cx="90" cy="122" r="16" fill="var(--mint)" opacity="0.9" />
      <g opacity="0.55">
        <path d="M210 150 q6 -14 18 -14 q-2 -12 8 -18 q12 -6 20 4 q10 -6 18 4 q6 8 -2 16 q6 10 -4 16 q-10 6 -20 -2 q-10 8 -22 2 q-10 -6 -16 -8Z" fill="var(--ink)" opacity="0.12" />
        <circle cx="222" cy="150" r="3" fill="var(--ink)" opacity="0.3" />
        <circle cx="234" cy="146" r="3" fill="var(--ink)" opacity="0.3" />
        <circle cx="246" cy="150" r="3" fill="var(--ink)" opacity="0.3" />
      </g>
    </svg>
  );
}

export function PourQuiSection() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [selected, setSelected] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const { addItem, openCart } = useCart();

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const photoFor = (theme: string) => (theme === "kids" ? sceneBedroom : theme === "perchoir" ? sceneGrandma : null);

  return (
    <div className="h-full w-full px-8 md:px-16 lg:px-24 flex flex-col justify-center">
      <div className="flex items-end justify-between max-w-4xl">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">02 — Pour qui</div>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold leading-tight">
            Trois éditions,<br />un même œil attentif.
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md text-sm">
            Jasper s'adapte à celles et ceux qui comptent chez vous. Faites glisser pour découvrir chaque édition.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 pr-24">
          <button
            aria-label="Édition précédente"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            className="h-10 w-10 rounded-full border border-ink/15 bg-white flex items-center justify-center disabled:opacity-30 hover:border-ink/40 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Édition suivante"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            className="h-10 w-10 rounded-full border border-ink/15 bg-white flex items-center justify-center disabled:opacity-30 hover:border-ink/40 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-8 overflow-hidden pr-8 md:pr-24" ref={emblaRef}>
        <div className="flex gap-5">
          {EDITIONS.map((ed) => {
            const style = THEME_STYLES[ed.theme];
            const photo = photoFor(ed.theme);
            return (
              <article
                key={ed.id}
                className="shrink-0 grow-0 basis-[88%] sm:basis-[70%] lg:basis-[46%] rounded-[2rem] bg-white border border-ink/5 shadow-soft overflow-hidden flex flex-col md:flex-row"
              >
                <div className={`relative md:w-[42%] aspect-[4/3] md:aspect-auto bg-gradient-to-br ${style.bg} overflow-hidden`}>
                  {photo ? (
                    <img src={photo} alt={ed.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <GrandAirIllustration />
                  )}
                  {ed.theme === "perchoir" && (
                    <div className="absolute inset-0">
                      <PerchoirIllustration />
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <span className={`self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${style.accent}`}>
                    {ed.audience}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold">{ed.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{ed.tagline}</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    {ed.features.slice(0, 3).map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="mt-1 h-1 w-1 rounded-full bg-ink/40 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>{ed.safety}</span>
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="font-display font-semibold text-lg">
                      {ed.price} €
                      {ed.compareAt && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground line-through">{ed.compareAt} €</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        addItem(ed.id);
                        toast.success(`${ed.name} ajoutée au panier`);
                        openCart();
                      }}
                      className="rounded-full bg-ink text-cream px-4 py-2 text-xs font-semibold hover:opacity-90 transition"
                    >
                      Choisir cette édition
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        {EDITIONS.map((ed, i) => (
          <button
            key={ed.id}
            aria-label={`Aller à ${ed.name}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${i === selected ? "w-8 bg-ink" : "w-1.5 bg-ink/25"}`}
          />
        ))}
      </div>
    </div>
  );
}
