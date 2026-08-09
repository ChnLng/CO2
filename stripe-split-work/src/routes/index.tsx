import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import jasperHero from "@/assets/jasper-hero.jpg";
import { CartProvider, useCart } from "@/lib/cart-context";
import { EDITIONS } from "@/components/site/editions";
import { PourQuiSection } from "@/components/site/pour-qui-carousel";
import { CartSheet } from "@/components/site/cart-sheet";
import { CountdownBadge } from "@/components/site/countdown-badge";
import { NewsletterForm } from "@/components/site/newsletter-form";
import {
  FooterInfoDialog,
  type FooterKey,
} from "@/components/site/footer-info";
import { Toaster } from "@/components/sonner";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export const Route = createFileRoute("/")({
  component: () => (
    <CartProvider>
      <Index />
      <Toaster position="bottom-center" richColors closeButton />
    </CartProvider>
  ),
});

type SectionId =
  "accueil" | "pour-qui" | "fonctionnement" | "technologie" | "commander";

const SECTIONS: { id: SectionId; label: string; num: string }[] = [
  { id: "accueil", label: "Accueil", num: "01" },
  { id: "pour-qui", label: "Pour qui", num: "02" },
  { id: "fonctionnement", label: "Comment ça marche", num: "03" },
  { id: "technologie", label: "Technologie", num: "04" },
  { id: "commander", label: "Commander", num: "05" },
];

function Index() {
  const [active, setActive] = useState(0);
  const lockRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      toast.success("Paiement confirmé  支付成功");
    } else if (payment === "cancelled") {
      toast.info("Paiement annulé  支付已取消");
    }
    if (payment) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      if (lockRef.current) return;
      if (Math.abs(e.deltaY) < 20) return;
      lockRef.current = true;
      setActive((a) =>
        Math.min(SECTIONS.length - 1, Math.max(0, a + (e.deltaY > 0 ? 1 : -1))),
      );
      setTimeout(() => (lockRef.current = false), 700);
    };
    const key = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        setActive((a) => Math.min(SECTIONS.length - 1, a + 1));
      }
      if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      }
    };
    window.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-cream text-ink relative bg-noise">
      <TopBar />
      <SideNav active={active} onChange={setActive} />

      <main className="absolute inset-0 pt-16 pb-14">
        <div
          className="h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={{ transform: `translateY(-${active * 100}%)` }}
        >
          <Section>
            <Accueil go={() => setActive(4)} more={() => setActive(1)} />
          </Section>
          <Section>
            <PourQuiSection />
          </Section>
          <Section>
            <Fonctionnement />
          </Section>
          <Section>
            <Technologie />
          </Section>
          <Section>
            <Commander />
          </Section>
        </div>
      </main>

      <Footer />
      <CartSheet />
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full shrink-0">{children}</div>;
}

function TopBar() {
  const { count, openCart } = useCart();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async (session: Session | null) => {
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        setRole(data?.role || null);
      } else {
        setUser(null);
        setRole(null);
      }
    };

    supabase.auth.getSession().then(({ data }) => checkUser(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <header className="absolute top-0 inset-x-0 h-16 z-30 flex items-center justify-between px-8 md:px-14">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-ink flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-mint" />
        </div>
        <span className="font-display font-semibold text-lg tracking-tight">
          Jasper
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
        {user ? (
          <>
            {role === "admin" && (
              <a
                href="/admin"
                className="hover:text-ink transition-colors font-semibold"
              >
                Admin
              </a>
            )}
            <a href="/orders" className="hover:text-ink transition-colors">
              Commandes
            </a>
            <button
              onClick={handleLogout}
              className="hover:text-ink transition-colors"
            >
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <a href="/login" className="hover:text-ink transition-colors">
              Connexion
            </a>
            <a
              href="/register"
              className="ml-4 hover:text-ink transition-colors bg-ink text-cream px-4 py-1.5 rounded-full text-xs"
            >
              Inscription
            </a>
          </>
        )}
      </nav>

      <button
        onClick={openCart}
        className="rounded-full bg-ink text-cream px-4 py-2 text-sm font-semibold hover:opacity-90 transition flex items-center gap-1.5"
      >
        <ShoppingBag className="h-3.5 w-3.5" /> Panier · {count}
      </button>
    </header>
  );
}

function SideNav({
  active,
  onChange,
}: {
  active: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4">
      {SECTIONS.map((s, i) => {
        const on = i === active;
        return (
          <button
            key={s.id}
            onClick={() => onChange(i)}
            className="group flex items-center gap-3 justify-end"
            aria-label={s.label}
          >
            <span
              className={`text-xs font-semibold tracking-wider uppercase transition-all ${on ? "opacity-100 text-ink" : "opacity-0 group-hover:opacity-70 text-muted-foreground"}`}
            >
              {s.num} · {s.label}
            </span>
            <span
              className={`block rounded-full transition-all ${on ? "h-8 w-1.5 bg-ink" : "h-1.5 w-1.5 bg-ink/30 group-hover:bg-ink/60"}`}
            />
          </button>
        );
      })}
    </div>
  );
}

function Footer() {
  const items: { key: FooterKey; label: string }[] = [
    { key: "confidentialite", label: "Confidentialité" },
    { key: "securite", label: "Sécurité des données" },
    { key: "guide", label: "Guide d'utilisation" },
    { key: "maj", label: "Mises à jour" },
    { key: "contact", label: "Contact & SAV" },
  ];
  const [open, setOpen] = useState<FooterKey | null>(null);

  return (
    <footer className="absolute bottom-0 inset-x-0 h-14 z-30 flex items-center justify-between px-8 md:px-14 border-t border-ink/10 bg-cream/80 backdrop-blur gap-4">
      <div className="text-xs text-muted-foreground hidden lg:block shrink-0">
        © 2026 Jasper · Conçu à Paris-Saclay
      </div>
      <ul className="flex items-center gap-3 md:gap-5 text-[12px] text-muted-foreground flex-wrap">
        {items.map((i) => (
          <li key={i.key}>
            <button
              onClick={() => setOpen(i.key)}
              className="hover:text-ink transition-colors"
            >
              {i.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden xl:flex items-center gap-4 shrink-0">
        <NewsletterForm />
        <div className="text-xs text-muted-foreground flex items-center gap-2 whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-mint animate-pulse" />{" "}
          Serveurs FR · RGPD
        </div>
      </div>

      {open && (
        <FooterInfoDialog
          item={open}
          onOpenChange={(o) => !o && setOpen(null)}
        />
      )}
    </footer>
  );
}

/* ---------- Sections ---------- */

function Accueil({ go, more }: { go: () => void; more: () => void }) {
  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 items-center px-8 md:px-16 lg:px-24">
      <div className="max-w-xl">
        <CountdownBadge />
        <h1 className="mt-5 font-display text-5xl md:text-6xl lg:text-7xl font-600 leading-[1.02] tracking-tight">
          Un air sain,
          <br />
          <span className="italic text-primary">tout simplement.</span>
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
          Jasper est un capteur de CO₂ pensé pour les familles. Son ventre
          change de couleur pour vous dire, en un clin d'œil, quand il est temps
          d'aérer — pour protéger enfants, aînés et animaux.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={go}
            className="rounded-full bg-ink text-cream px-6 py-3.5 text-sm font-semibold hover:scale-[1.02] transition shadow-soft"
          >
            Commander — dès 129 €
          </button>
          <button
            onClick={more}
            className="rounded-full bg-white border border-ink/15 px-6 py-3.5 text-sm font-semibold hover:bg-white/70 transition"
          >
            Découvrir Jasper →
          </button>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
          {[
            { k: "4,9/5", v: "Avis parents" },
            { k: "< 30s", v: "Installation" },
            { k: "2 ans", v: "Garantie" },
          ].map((s) => (
            <div key={s.k}>
              <div className="font-display text-2xl font-semibold">{s.k}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative h-full flex items-center justify-center">
        <div className="absolute inset-6 rounded-[3rem] bg-gradient-to-br from-mint-soft via-sky/40 to-blush/40 blur-2xl opacity-70" />
        <div className="absolute -top-2 -left-2 rounded-3xl bg-white shadow-soft px-4 py-3 flex items-center gap-3 rotate-[-4deg]">
          <div className="h-9 w-9 rounded-full bg-mint flex items-center justify-center font-display font-bold text-ink">
            ✓
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              Air en ce moment
            </div>
            <div className="font-display font-semibold text-sm">
              560 ppm · Excellent
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 right-2 rounded-3xl bg-white shadow-soft px-4 py-3 rotate-[3deg]">
          <div className="text-[11px] text-muted-foreground">Certifié</div>
          <div className="font-display font-semibold text-sm">
            NDIR · ± 30 ppm
          </div>
        </div>
        <img
          src={jasperHero}
          alt="Jasper, détecteur de CO₂ en forme de pingouin"
          width={720}
          height={720}
          className="relative max-h-[85%] w-auto object-contain drop-shadow-2xl"
        />
      </div>
    </div>
  );
}

function Fonctionnement() {
  const states = [
    {
      color: "var(--mint)",
      label: "Excellent",
      range: "< 800 ppm",
      copy: "L'air est sain, tout va bien.",
      emoji: "😊",
    },
    {
      color: "var(--warn)",
      label: "Aérez",
      range: "800 – 1400 ppm",
      copy: "Ouvrez une fenêtre quelques minutes.",
      emoji: "🙂",
    },
    {
      color: "var(--danger)",
      label: "Aérez vite",
      range: "> 1400 ppm",
      copy: "Trop de CO₂ : aération immédiate.",
      emoji: "😮",
    },
  ];
  return (
    <div className="h-full w-full px-8 md:px-16 lg:px-24 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 items-center">
      <div className="max-w-lg">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          03 — Fonctionnement
        </div>
        <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold leading-tight">
          Une couleur.
          <br />
          <span className="italic">Un geste.</span>
        </h2>
        <p className="mt-5 text-muted-foreground leading-relaxed">
          Pas d'application obligatoire, pas de notification anxiogène. Le
          ventre de Jasper s'illumine doucement : vert, orange, rouge. Appuyez
          sur son bec pour entendre la valeur exacte en ppm.
        </p>
        <ul className="mt-6 space-y-2.5 text-sm">
          {[
            "Mesure NDIR de qualité laboratoire",
            "Alerte lumineuse discrète, sans écran anxiogène",
            "Fonctionne hors ligne, sans compte",
          ].map((l) => (
            <li key={l} className="flex items-start gap-2.5">
              <span className="mt-1 h-4 w-4 rounded-full bg-mint flex items-center justify-center text-[10px] font-bold text-ink">
                ✓
              </span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-4 pr-24">
        {states.map((s, i) => (
          <div
            key={s.label}
            className="rounded-[2rem] bg-white border border-ink/5 shadow-soft p-5 flex flex-col items-center text-center"
          >
            <div className="relative h-32 w-24 rounded-t-[999px] rounded-b-3xl bg-ink flex items-end justify-center pb-2 overflow-hidden">
              <div className="absolute top-4 flex gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <div
                className="h-14 w-14 rounded-full"
                style={{
                  background: s.color,
                  boxShadow: `0 0 40px ${s.color}`,
                }}
              />
            </div>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Étape {i + 1}
            </div>
            <div className="mt-1 font-display font-semibold text-lg">
              {s.label}
            </div>
            <div className="text-xs text-muted-foreground">{s.range}</div>
            <p className="mt-2 text-xs leading-relaxed">{s.copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Technologie() {
  const specs = [
    {
      k: "Capteur NDIR",
      v: "Précision ± 30 ppm, la même technologie que dans les laboratoires.",
    },
    {
      k: "Fabrication FR",
      v: "Boîtier imprimé et assemblé à Paris-Saclay, matériaux recyclables.",
    },
    {
      k: "Open-source",
      v: "Firmware et plans libres — vous restez maître de votre appareil.",
    },
    {
      k: "Sans cloud obligatoire",
      v: "Vos données restent chez vous. Aucun compte requis.",
    },
    { k: "Durable", v: "Réparable, mises à jour gratuites pendant 5 ans." },
    {
      k: "Seuils reconnus",
      v: "Aligné sur les recommandations de référence en qualité de l'air intérieur.",
    },
  ];
  return (
    <div className="h-full w-full px-8 md:px-16 lg:px-24 flex flex-col justify-center">
      <div className="max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          04 — Technologie & confiance
        </div>
        <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold leading-tight">
          Une science solide,
          <br />
          un objet honnête.
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl">
          Jasper repose sur le capteur NDIR, la référence en mesure de CO₂, et
          sur des seuils d'alerte alignés avec les travaux scientifiques sur le
          renouvellement de l'air intérieur.
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-24">
        {specs.map((s) => (
          <div
            key={s.k}
            className="rounded-2xl bg-white border border-ink/5 p-5 hover:shadow-soft transition"
          >
            <div className="font-display font-semibold text-base">{s.k}</div>
            <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {s.v}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <Badge>CE</Badge>
        <Badge>RGPD</Badge>
        <Badge>Open Hardware</Badge>
        <Badge>Éco-conçu</Badge>
        <Badge>Fabriqué en France</Badge>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground/70 max-w-xl">
        Mentions de conformité à confirmer avant publication selon vos
        certifications réelles.
      </p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-ink/15 bg-white px-3 py-1.5 font-semibold text-ink/70">
      {children}
    </span>
  );
}

function Commander() {
  const [selected, setSelected] = useState(EDITIONS[0].id);
  const edition = EDITIONS.find((e) => e.id === selected) ?? EDITIONS[0];
  const { addItem, openCart } = useCart();

  return (
    <div className="h-full w-full px-8 md:px-16 lg:px-24 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 items-center">
      <div className="max-w-lg">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          05 — Commander
        </div>
        <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold leading-tight">
          Faites entrer Jasper
          <br />
          dans votre maison.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Livraison gratuite en France sous 3 jours. Satisfait ou remboursé
          pendant 30 jours.
        </p>
        <ul className="mt-6 space-y-2 text-sm">
          {[
            "1 capteur Jasper",
            "Câble USB-C tressé",
            "Guide de démarrage illustré",
            "Autocollants pour les enfants",
          ].map((l) => (
            <li key={l} className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ink" /> {l}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative rounded-[2.5rem] bg-white border border-ink/5 shadow-soft p-7 pr-24 lg:pr-7 max-w-md justify-self-end lg:mr-24">
        <div className="flex items-center gap-5">
          <img
            src={jasperHero}
            alt=""
            width={140}
            height={140}
            loading="lazy"
            className="h-32 w-32 object-contain rounded-2xl bg-mint-soft"
          />
          <div>
            <div className="font-display font-semibold text-xl">
              {edition.name}
            </div>
            <div className="text-sm text-muted-foreground">
              Ventre lumineux · Voix française
            </div>
            <div className="mt-3 font-display text-3xl font-semibold">
              {edition.price} €
              {edition.compareAt && (
                <span className="ml-2 text-sm font-normal text-muted-foreground line-through">
                  {edition.compareAt} €
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {EDITIONS.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelected(e.id)}
              className={`rounded-2xl border px-2 py-2 text-[11px] font-semibold leading-tight ${e.id === selected ? "border-ink bg-ink text-cream" : "border-ink/15 hover:border-ink/40"}`}
            >
              {e.audience}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          {edition.tagline}
        </p>
        <button
          onClick={() => {
            addItem(edition.id);
            toast.success(`${edition.name} ajoutée au panier`);
            openCart();
          }}
          className="mt-5 w-full rounded-full bg-ink text-cream py-3.5 font-semibold hover:opacity-90 transition"
        >
          Ajouter au panier →
        </button>
        <div className="mt-3 text-[11px] text-center text-muted-foreground">
          Paiement sécurisé · 3× sans frais · SAV français
        </div>
      </div>
    </div>
  );
}
