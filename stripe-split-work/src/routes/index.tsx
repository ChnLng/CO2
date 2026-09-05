import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Menu, ShoppingBag, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import jasperClairHero from "@/assets/jasper-clair-hero.png";
import { CartSheet } from "@/components/site/cart-sheet";
import { EDITIONS } from "@/components/site/editions";
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

function Index() {
  const { addItem, setOpen, itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") toast.success("Paiement confirmé.");
    if (params.get("payment") === "cancelled") toast.info("Paiement annulé.");
    if (params.has("payment")) window.history.replaceState({}, "", window.location.pathname);
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const addToCart = () => {
    addItem(edition);
    setOpen(true);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Vous êtes déconnecté(e).");
  };

  return (
    <main className="min-h-screen bg-[#f8f5ed] text-[#20382a]">
      <header className="sticky top-0 z-40 border-b border-[#20382a]/10 bg-[#f8f5ed]/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5">
          <a href="#accueil" className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#20382a] text-[#e5d98a]">J</span>
            Jasper
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#principe" className="hover:text-[#d36b35]">Le principe</a>
            <a href="#pour-qui" className="hover:text-[#d36b35]">Pour qui</a>
            <a href="#design" className="hover:text-[#d36b35]">Le design</a>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <>
                <Link to="/account" className="hidden rounded-full px-3 py-2 text-sm font-medium hover:bg-[#20382a]/5 sm:block">Mon compte</Link>
                {user?.email === "visdar@outlook.fr" || user?.email === "anna.mecatronics@gmail.com" ? <Link to="/admin" className="hidden rounded-full px-3 py-2 text-sm font-medium hover:bg-[#20382a]/5 sm:block">Administration</Link> : null}
                <button onClick={signOut} className="hidden rounded-full px-3 py-2 text-sm font-medium hover:bg-[#20382a]/5 sm:block">Déconnexion</button>
              </>
            ) : <Link to="/login" className="hidden rounded-full px-3 py-2 text-sm font-medium hover:bg-[#20382a]/5 sm:block">Connexion</Link>}
            <button onClick={() => setOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-full bg-[#20382a] text-white" aria-label="Ouvrir le panier">
              <ShoppingBag className="h-4 w-4" />
              {itemCount > 0 ? <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#d36b35] text-[10px] font-bold">{itemCount}</span> : null}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-10 w-10 place-items-center rounded-full border border-[#20382a]/15 md:hidden" aria-label="Ouvrir le menu"><Menu className="h-4 w-4" /></button>
          </div>
        </div>
        {menuOpen ? <nav className="border-t border-[#20382a]/10 px-5 py-4 md:hidden"><div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm font-medium"><a onClick={() => setMenuOpen(false)} href="#principe">Le principe</a><a onClick={() => setMenuOpen(false)} href="#pour-qui">Pour qui</a><a onClick={() => setMenuOpen(false)} href="#design">Le design</a><Link onClick={() => setMenuOpen(false)} to={session ? "/account" : "/login"}>{session ? "Mon compte" : "Connexion"}</Link></div></nav> : null}
      </header>

      <section id="accueil" className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1fr_1.04fr] md:items-center md:py-20">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e5d98a]/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em]"><Wind className="h-4 w-4" /> Jasper Clair · première série</p>
          <h1 className="max-w-xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">Vous n’avez pas besoin d’une application pour savoir quand ouvrir la fenêtre.</h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-[#20382a]/75">Jasper Clair rend l’air de la maison facile à lire : un grand chiffre, une couleur, puis le bon réflexe.</p>
          <div className="mt-8 flex flex-wrap gap-3"><button onClick={addToCart} className="inline-flex items-center gap-2 rounded-full bg-[#d36b35] px-6 py-3.5 font-bold text-white transition hover:bg-[#b95428]">Précommander à 89 € <ArrowRight className="h-4 w-4" /></button><a href="#principe" className="rounded-full border border-[#20382a]/20 px-6 py-3.5 font-bold hover:bg-white">Voir le principe</a></div>
          <p className="mt-5 text-sm text-[#20382a]/60">Prix fondateur · sans application obligatoire · pour toute la maison</p>
        </div>
        <figure className="overflow-hidden rounded-[2rem] bg-[#ddd5c1] shadow-[0_24px_70px_rgba(32,56,42,.16)]"><img src={jasperClairHero} alt="Jasper Clair posé dans un salon lumineux" className="h-full min-h-[340px] w-full object-cover" /></figure>
      </section>

      <section id="principe" className="border-y border-[#20382a]/10 bg-white py-16">
        <div className="mx-auto max-w-6xl px-5"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.15em] text-[#d36b35]">Un signal, pas un tableau de bord</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Regarder. Aérer. Revenir à sa journée.</h2><p className="mt-5 text-lg leading-relaxed text-[#20382a]/75">Le CO₂ est un indicateur du confinement de l’air. Jasper ne pose pas de diagnostic médical : il vous aide simplement à repérer le bon moment pour renouveler l’air.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3"><Signal colour="bg-[#4f9d69]" title="Vert" range="Moins de 800 ppm" copy="L’air est suffisamment renouvelé." /><Signal colour="bg-[#e0a43d]" title="Ambre" range="800 à 1 400 ppm" copy="Pensez à ouvrir quelques minutes." /><Signal colour="bg-[#c95842]" title="Rouge" range="Plus de 1 400 ppm" copy="Aérez maintenant si vous le pouvez." /></div>
        </div>
      </section>

      <section id="pour-qui" className="mx-auto max-w-6xl px-5 py-18"><div className="grid gap-10 md:grid-cols-[.8fr_1.2fr]"><div><p className="text-sm font-bold uppercase tracking-[0.15em] text-[#d36b35]">Pensé pour les vraies journées</p><h2 className="mt-3 text-4xl font-black tracking-tight">Une seule version. Trois moments où elle compte.</h2></div><div className="grid gap-4 sm:grid-cols-3"><UseCase number="01" title="La chambre" copy="Quand une porte reste fermée toute la nuit." /><UseCase number="02" title="Le bureau" copy="Quand on perd le fil au milieu d’une longue visio." /><UseCase number="03" title="Le salon" copy="Quand toute la famille se retrouve." /></div></div></section>

      <section id="design" className="bg-[#20382a] py-18 text-[#f8f5ed]"><div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[0.15em] text-[#e5d98a]">Le bon objet pour commencer</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Moins de plastique spectaculaire. Plus d’objet que l’on garde.</h2><p className="mt-6 max-w-xl text-lg leading-relaxed text-[#f8f5ed]/75">Un format compact, une face rigide lisible et un bord doux protégeant les mains et le mobilier. Le choix d’une seule forme réduit les coûts de départ sans sacrifier la présence sur une table de chevet.</p></div><div className="grid content-start gap-4"><DesignPoint title="Un bord doux, remplaçable" copy="Une structure stable et une protection souple séparée : plus simple à fabriquer et à entretenir qu’une coque entièrement souple." /><DesignPoint title="Sans écran de téléphone" copy="Le chiffre utile reste dans la pièce, visible de tous, sans compte ni notifications." /><DesignPoint title="Capteur à valider avant vente" copy="L’architecture visée repose sur un capteur NDIR. Les performances finales seront mesurées et publiées avant commercialisation." /></div></div></section>

      <section id="commander" className="mx-auto max-w-6xl px-5 py-18"><div className="rounded-[2rem] border border-[#20382a]/15 bg-white p-7 shadow-sm md:flex md:items-center md:justify-between md:p-10"><div><p className="text-sm font-bold uppercase tracking-[0.15em] text-[#d36b35]">Première série</p><h2 className="mt-2 text-4xl font-black tracking-tight">{edition.name}</h2><p className="mt-3 max-w-xl text-[#20382a]/70">{edition.copy}</p><ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">{edition.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4f9d69]" />{feature}</li>)}</ul></div><div className="mt-7 min-w-52 rounded-3xl bg-[#f8f5ed] p-6 md:mt-0"><p className="text-sm text-[#20382a]/60">Prix fondateur</p><p className="mt-1 text-4xl font-black">89 € <span className="text-lg font-medium text-[#20382a]/40 line-through">99 €</span></p><button onClick={addToCart} className="mt-5 w-full rounded-full bg-[#d36b35] px-5 py-3 font-bold text-white hover:bg-[#b95428]">Précommander</button></div></div><p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-relaxed text-[#20382a]/55">Avant l’ouverture commerciale, les caractéristiques définitives, les conformités, les dates et les conditions de livraison seront confirmées de façon transparente.</p></section>

      <footer className="border-t border-[#20382a]/10 px-5 py-9 text-sm text-[#20382a]/65"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 sm:flex-row"><p>© {new Date().getFullYear()} Jasper · Une maison plus facile à aérer.</p><div className="flex gap-4"><Link to="/account">Mon compte</Link><Link to="/orders">Mes commandes</Link>{user?.email === "visdar@outlook.fr" || user?.email === "anna.mecatronics@gmail.com" ? <Link to="/admin">Administration</Link> : null}</div></div></footer>
      <CartSheet />
    </main>
  );
}

function Signal({ colour, title, range, copy }: { colour: string; title: string; range: string; copy: string }) {
  return <article className="rounded-3xl border border-[#20382a]/10 p-6"><span className={`mb-8 block h-4 w-4 rounded-full ${colour}`} /><h3 className="text-2xl font-black">{title}</h3><p className="mt-1 font-semibold">{range}</p><p className="mt-4 text-sm leading-relaxed text-[#20382a]/65">{copy}</p></article>;
}

function UseCase({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-xs font-black tracking-[.14em] text-[#d36b35]">{number}</p><h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[#20382a]/65">{copy}</p></article>;
}

function DesignPoint({ title, copy }: { title: string; copy: string }) {
  return <article className="border-l-2 border-[#e5d98a] pl-5"><h3 className="font-black">{title}</h3><p className="mt-1 text-sm leading-relaxed text-[#f8f5ed]/70">{copy}</p></article>;
}
