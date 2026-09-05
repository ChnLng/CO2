import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import jasperClairHero from "@/assets/jasper-clair-hero.png";
import { CartSheet } from "@/components/site/cart-sheet";
import { EDITIONS } from "@/components/site/editions";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { Toaster } from "@/components/sonner";
import { CartProvider, useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Session, User } from "@supabase/supabase-js";

export const Route = createFileRoute("/")({
  component: () => (
    <CartProvider>
      <Index />
      <Toaster position="bottom-center" richColors closeButton />
    </CartProvider>
  ),
});

const edition = EDITIONS[0];
const SECTIONS = ["Accueil", "Le signal", "La maison", "L’objet", "Réserver"];

function Index() {
  const [active, setActive] = useState(0);
  const lockRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") toast.success("Paiement confirmé.");
    if (params.get("payment") === "cancelled") toast.info("Paiement annulé.");
    if (params.has("payment")) window.history.replaceState({}, "", window.location.pathname);
    const wheel = (event: WheelEvent) => {
      if (lockRef.current || Math.abs(event.deltaY) < 25) return;
      lockRef.current = true;
      setActive((value) => Math.min(SECTIONS.length - 1, Math.max(0, value + (event.deltaY > 0 ? 1 : -1))));
      window.setTimeout(() => (lockRef.current = false), 750);
    };
    const key = (event: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(event.key)) { event.preventDefault(); setActive((value) => Math.min(SECTIONS.length - 1, value + 1)); }
      if (["ArrowUp", "PageUp"].includes(event.key)) { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
    };
    window.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("wheel", wheel); window.removeEventListener("keydown", key); };
  }, []);

  return <div className="relative h-screen w-screen overflow-hidden bg-cream text-ink bg-noise">
    <TopBar />
    <SideNav active={active} onChange={setActive} />
    <BubbleCloud />
    <main className="absolute inset-0 z-10 pb-14 pt-16">
      <div className="h-full transition-transform duration-700 ease-[cubic-bezier(.65,0,.35,1)]" style={{ transform: `translateY(-${active * 100}%)` }}>
        <Slide><Hero onReserve={() => setActive(4)} onMore={() => setActive(1)} /></Slide>
        <Slide><Signal /></Slide>
        <Slide><Home /></Slide>
        <Slide><Object /></Slide>
        <Slide><Reserve /></Slide>
      </div>
    </main>
    <Footer />
    <CartSheet />
  </div>;
}

function Slide({ children }: { children: React.ReactNode }) { return <section className="h-full w-full">{children}</section>; }

function TopBar() {
  const { count, openCart } = useCart();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    const hydrate = async (session: Session | null) => {
      setUser(session?.user ?? null);
      if (!session?.user) return setRole(null);
      const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      setRole(data?.role ?? null);
    };
    supabase.auth.getSession().then(({ data }) => hydrate(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => hydrate(session));
    return () => listener.subscription.unsubscribe();
  }, []);
  const logout = async () => { await supabase.auth.signOut(); toast.success("Vous êtes déconnecté(e)."); };
  return <header className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-7 md:px-14">
    <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-black text-mint">J</span><span className="font-display text-lg font-semibold tracking-tight">Jasper</span></div>
    <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
      {user ? <>{role === "admin" ? <a href="/admin" className="hover:text-ink">Administration</a> : null}<a href="/orders" className="hover:text-ink">Commandes</a><button onClick={logout} className="hover:text-ink">Déconnexion</button></> : <><a href="/login" className="hover:text-ink">Connexion</a><a href="/register" className="rounded-full bg-ink px-4 py-1.5 text-xs text-cream">Créer un compte</a></>}
    </nav>
    <button onClick={openCart} className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream shadow-soft transition hover:scale-[1.02]"><ShoppingBag className="h-3.5 w-3.5" /> Panier · {count}</button>
  </header>;
}

function SideNav({ active, onChange }: { active: number; onChange: (value: number) => void }) {
  return <div className="absolute right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-4 md:flex">{SECTIONS.map((label, index) => <button key={label} onClick={() => onChange(index)} className="group flex items-center justify-end gap-3" aria-label={label}><span className={`text-xs font-semibold transition-all ${active === index ? "text-ink opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-70"}`}>{String(index + 1).padStart(2, "0")} · {label}</span><span className={`block rounded-full transition-all ${active === index ? "h-8 w-1.5 bg-ink" : "h-1.5 w-1.5 bg-ink/30"}`} /></button>)}<div className="pointer-events-none absolute -bottom-44 -right-2 h-40 w-14 overflow-hidden"><i className="jasper-bubble jasper-bubble-one" /><i className="jasper-bubble jasper-bubble-two" /><i className="jasper-bubble jasper-bubble-three" /></div></div>;
}

function BubbleCloud() {
  return <div className="jasper-bubble-field pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true"><i className="jasper-clean-bubble jasper-clean-bubble-a" /><i className="jasper-clean-bubble jasper-clean-bubble-b" /><i className="jasper-clean-bubble jasper-clean-bubble-c" /><i className="jasper-clean-bubble jasper-clean-bubble-d" /><i className="jasper-clean-bubble jasper-clean-bubble-e" /></div>;
}

function Hero({ onReserve, onMore }: { onReserve: () => void; onMore: () => void }) {
  return <div className="relative grid h-full grid-cols-1 items-center gap-5 overflow-hidden px-7 md:px-14 lg:grid-cols-[.94fr_1.06fr] lg:px-24">
    <div className="jasper-hero-content z-10 max-w-xl"><p className="inline-flex rounded-full border border-ink/10 bg-white/65 px-4 py-2 text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">Jasper Clair · première série</p><h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">L’air de votre maison.<br /><span className="italic text-primary">Enfin lisible.</span></h1><p className="jasper-hero-copy mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">Un objet calme qui vous indique simplement le moment d’aérer — dans la chambre, au bureau, au salon.</p><div className="jasper-hero-actions mt-8 flex flex-wrap gap-3"><button onClick={onReserve} className="rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-cream shadow-soft transition hover:scale-[1.02]">Découvrir la première série</button><button onClick={onMore} className="rounded-full border border-ink/15 bg-white/70 px-6 py-3.5 text-sm font-semibold transition hover:bg-white">Voir comment il agit</button></div><div className="jasper-hero-stats mt-9 flex gap-7 text-xs text-muted-foreground"><span><b className="block font-display text-xl text-ink">Un regard</b>pour comprendre</span><span><b className="block font-display text-xl text-ink">Sans App</b>obligatoire</span><span><b className="block font-display text-xl text-ink">89 €</b>prix fondateur</span></div></div>
    <div className="pointer-events-none absolute -bottom-12 -right-20 h-[31%] w-[70%] overflow-hidden rounded-[2.25rem] opacity-45 shadow-soft sm:-right-10 sm:h-[35%] sm:w-[54%] lg:hidden"><img src={jasperClairHero} alt="" className="h-full w-full object-cover" /></div><div className="relative hidden h-full items-center justify-center lg:flex"><div className="absolute inset-6 rounded-[3.25rem] bg-gradient-to-br from-sky/55 via-mint-soft/65 to-blush/45 blur-2xl" /><div className="relative h-[77%] w-[86%] overflow-hidden rounded-[2.75rem] bg-white shadow-soft"><img src={jasperClairHero} alt="Jasper Clair dans une maison lumineuse" className="h-full w-full object-cover" /></div><div className="absolute left-0 top-[16%] rounded-3xl bg-white/95 px-4 py-3 shadow-soft rotate-[-4deg]"><p className="text-[11px] text-muted-foreground">Dans la chambre</p><p className="font-display text-sm font-semibold">Une lumière suffit.</p></div><div className="absolute bottom-[15%] right-0 rounded-3xl bg-white/95 px-4 py-3 shadow-soft rotate-[3deg]"><p className="text-[11px] text-muted-foreground">Sans notification</p><p className="font-display text-sm font-semibold">Sans anxiété.</p></div></div>
  </div>;
}

function Signal() {
  const states = [{ label: "Respirer", range: "moins de 800 ppm", color: "bg-mint", copy: "L’air est suffisamment renouvelé." }, { label: "Ouvrir", range: "800 à 1 400 ppm", color: "bg-warn", copy: "Quelques minutes suffisent souvent." }, { label: "Aérer", range: "plus de 1 400 ppm", color: "bg-danger", copy: "Le signal vous invite à agir." }];
  return <div className="grid h-full grid-cols-1 items-center gap-8 px-7 md:px-14 lg:grid-cols-[.9fr_1.1fr] lg:px-24"><div className="max-w-lg"><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">01 — Le signal</p><h2 className="mt-3 font-display text-5xl font-semibold leading-tight">Une couleur.<br /><span className="italic">Un geste.</span></h2><p className="mt-5 max-w-md leading-relaxed text-muted-foreground">Pas de chiffres qui vous inquiètent, pas d’application qui vous sollicite. Jasper crée un rituel simple : regarder, ouvrir, continuer sa journée.</p></div><div className="grid grid-cols-3 gap-3 pr-0 md:pr-20">{states.map((state, index) => <article key={state.label} className="rounded-[2rem] border border-ink/5 bg-white/90 p-4 text-center shadow-soft md:p-5"><div className="mx-auto flex h-24 w-20 items-end justify-center overflow-hidden rounded-t-[999px] rounded-b-3xl bg-ink pb-3 md:h-32 md:w-24"><span className={`h-12 w-12 rounded-full ${state.color} shadow-glow`} /></div><p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Étape {index + 1}</p><h3 className="mt-1 font-display text-lg font-semibold">{state.label}</h3><p className="text-[11px] text-muted-foreground">{state.range}</p><p className="mt-2 hidden text-xs leading-relaxed text-muted-foreground md:block">{state.copy}</p></article>)}</div></div>;
}

function Home() { return <div className="grid h-full grid-cols-1 items-center gap-8 px-7 md:px-14 lg:grid-cols-[1.1fr_.9fr] lg:px-24"><div className="relative order-2 h-[38vh] overflow-hidden rounded-[2.75rem] bg-sky/40 shadow-soft lg:order-1 lg:h-[69vh]"><img src={jasperClairHero} alt="Une scène de vie familiale lumineuse" className="h-full w-full object-cover object-[70%_center] opacity-85" /><div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" /><p className="absolute bottom-6 left-7 rounded-full bg-cream/90 px-4 py-2 text-xs font-semibold text-ink">La maison change toute la journée.</p></div><div className="order-1 max-w-lg lg:order-2"><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">02 — La maison</p><h2 className="mt-3 font-display text-5xl font-semibold leading-tight">Il est là<br /><span className="italic">quand il faut.</span></h2><p className="mt-5 leading-relaxed text-muted-foreground">Une porte fermée toute la nuit. Une longue visioconférence. Un dimanche à plusieurs. Jasper n’interrompt rien : il rend simplement visible ce que la pièce vous raconte déjà.</p><div className="mt-7 grid grid-cols-3 gap-3 text-xs"><QuietCard title="Chambre" copy="au réveil" /><QuietCard title="Bureau" copy="entre deux idées" /><QuietCard title="Salon" copy="à plusieurs" /></div></div></div>; }
function QuietCard({ title, copy }: { title: string; copy: string }) { return <div className="rounded-2xl border border-ink/8 bg-white/75 p-3"><p className="font-display text-base font-semibold">{title}</p><p className="mt-1 text-muted-foreground">{copy}</p></div>; }

function Object() { return <div className="grid h-full grid-cols-1 items-center gap-8 px-7 md:px-14 lg:grid-cols-[.9fr_1.1fr] lg:px-24"><div className="max-w-lg"><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">03 — L’objet</p><h2 className="mt-3 font-display text-5xl font-semibold leading-tight">Un objet doux.<br /><span className="italic">Une présence nette.</span></h2><p className="mt-5 leading-relaxed text-muted-foreground">La forme est volontairement simple : une face claire, un grand affichage, un contour souple. Elle est pensée pour rester sur une table, pas pour devenir un autre écran à regarder.</p></div><div className="grid gap-3 pr-0 md:grid-cols-2 md:pr-20"><Feature title="Un affichage généreux" copy="La mesure importante se lit à distance, sans sortir son téléphone." /><Feature title="Une bordure protectrice" copy="Une structure stable, accompagnée d’un bord doux et remplaçable." /><Feature title="Un seul modèle" copy="Moins de variations, plus de soin apporté à la pièce essentielle." /><Feature title="Une technologie honnête" copy="Les mesures et conformités finales seront publiées avant ouverture commerciale." /></div></div>; }
function Feature({ title, copy }: { title: string; copy: string }) { return <article className="rounded-[1.75rem] border border-ink/7 bg-white/80 p-5 shadow-soft"><span className="mb-7 block h-2 w-2 rounded-full bg-mint" /><h3 className="font-display text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p></article>; }

function Reserve() { const { addItem, openCart } = useCart(); const reserve = () => { addItem(edition.id); openCart(); toast.success("Jasper Clair a été ajouté au panier."); }; return <div className="grid h-full grid-cols-1 items-center gap-8 px-7 md:px-14 lg:grid-cols-[1fr_.85fr] lg:px-24"><div className="max-w-lg"><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">04 — Première série</p><h2 className="mt-3 font-display text-5xl font-semibold leading-tight">Faites entrer Jasper<br /><span className="italic">dans votre maison.</span></h2><p className="mt-5 leading-relaxed text-muted-foreground">Une seule édition, pensée pour commencer juste. Les caractéristiques définitives, conformités et conditions de livraison seront confirmées avant l’ouverture commerciale.</p><ul className="mt-6 space-y-2.5 text-sm">{edition.features.map((feature) => <li key={feature} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-mint p-0.5" />{feature}</li>)}</ul></div><div className="relative rounded-[2.5rem] border border-ink/7 bg-white/90 p-7 shadow-soft md:mr-20"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Jasper Clair</p><p className="mt-2 font-display text-3xl font-semibold">89 € <span className="ml-1 text-base font-normal text-muted-foreground line-through">99 €</span></p></div><span className="rounded-full bg-mint-soft px-3 py-1.5 text-xs font-semibold">Prix fondateur</span></div><div className="my-6 h-px bg-ink/8" /><p className="text-sm leading-relaxed text-muted-foreground">Une première série pour celles et ceux qui veulent faire de l’air un réflexe doux, pas une source d’inquiétude.</p><button onClick={reserve} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 font-semibold text-cream shadow-soft transition hover:scale-[1.01]">Réserver Jasper Clair <ArrowRight className="h-4 w-4" /></button><p className="mt-3 text-center text-[11px] text-muted-foreground">Aucun engagement implicite sur les délais avant publication des conditions.</p></div></div>; }

function Footer() { return <footer className="absolute inset-x-0 bottom-0 z-30 flex h-14 items-center justify-between gap-5 border-t border-ink/10 bg-cream/85 px-7 text-xs text-muted-foreground backdrop-blur md:px-14"><span className="hidden shrink-0 lg:block">© 2026 Jasper · Un air plus simple.</span><nav className="flex min-w-0 items-center gap-3 whitespace-nowrap sm:gap-5"><a href="/account" className="hover:text-ink">Mon compte</a><a href="/orders" className="hover:text-ink">Commandes</a><span className="hidden sm:inline">Confidentialité</span><span className="hidden md:inline">Sécurité</span><span className="hidden lg:inline">Guide d’utilisation</span><span className="hidden xl:inline">Mises à jour</span><span>Contact</span></nav><div className="hidden xl:flex items-center gap-3"><NewsletterForm /><span className="flex items-center gap-2 whitespace-nowrap"><i className="h-2 w-2 rounded-full bg-mint" />Première série</span></div></footer>; }
