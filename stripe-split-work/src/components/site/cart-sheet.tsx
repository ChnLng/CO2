import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Sheet, SheetPortal, SheetOverlay } from "@/components/sheet";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useServerFn } from "@tanstack/react-start";
import { createStripeCheckoutSession } from "@/lib/stripeFunctions";

function euros(n: number) {
  return (
    n.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

export function CartSheet() {
  const {
    isOpen,
    closeCart,
    lineItems,
    setQty,
    removeItem,
    promoCode,
    promoMessage,
    applyPromoCode,
    clearPromoCode,
    subtotal,
    discount,
    total,
  } = useCart();
  const [promoInput, setPromoInput] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handlePromo = async () => {
    if (!promoInput.trim()) return;
    const res = await applyPromoCode(promoInput);
    if (res.valid) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) closeCart();
      }}
    >
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content className="fixed inset-y-0 right-0 z-50 h-full w-full sm:max-w-md border-l border-ink/10 bg-cream flex flex-col shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
          <div className="flex items-center justify-between px-6 py-5 border-b border-ink/10">
            <div className="flex items-center gap-2 font-display font-semibold text-lg">
              <ShoppingBag className="h-5 w-5" /> Votre panier
            </div>
            <SheetPrimitive.Close className="h-8 w-8 rounded-full hover:bg-ink/5 flex items-center justify-center transition">
              <X className="h-4 w-4" />
            </SheetPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {lineItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16">
                <ShoppingBag className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">Votre panier est vide.</p>
                <p className="text-xs mt-1">
                  Ajoutez Jasper Signal depuis la page d’accueil.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {lineItems.map(({ edition, qty, lineTotal }) => (
                  <li
                    key={edition.id}
                    className="flex gap-3 rounded-2xl bg-white border border-ink/5 p-3"
                  >
                    <div className="h-16 w-16 rounded-xl bg-mint-soft shrink-0 flex items-center justify-center text-[10px] text-center font-semibold text-ink/60 px-1">
                      {edition.audience}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {edition.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {euros(edition.price)} / unité
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 rounded-full border border-ink/10 px-1.5 py-1">
                          <button
                            aria-label="Diminuer la quantité"
                            onClick={() => setQty(edition.id, qty - 1)}
                            className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-ink/5"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs w-4 text-center">{qty}</span>
                          <button
                            aria-label="Augmenter la quantité"
                            onClick={() => setQty(edition.id, qty + 1)}
                            className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-ink/5"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {euros(lineTotal)}
                          </span>
                          <button
                            aria-label="Retirer du panier"
                            onClick={() => removeItem(edition.id)}
                            className="text-muted-foreground hover:text-danger transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lineItems.length > 0 && (
            <div className="border-t border-ink/10 px-6 py-5 space-y-4">
              <div>
                {promoCode ? (
                  <div className="flex items-center justify-between rounded-xl bg-mint-soft px-3 py-2 text-xs font-semibold">
                    <span>{promoMessage}</span>
                    <button
                      onClick={clearPromoCode}
                      className="text-ink/50 hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Code promo (ex. BIENVENUE10)"
                      className="flex-1 rounded-full border border-ink/15 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ink/30"
                    />
                    <button
                      onClick={handlePromo}
                      className="rounded-full border border-ink/15 px-3.5 py-2 text-xs font-semibold hover:bg-white transition"
                    >
                      Appliquer
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total</span>
                  <span>{euros(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Réduction</span>
                    <span>−{euros(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display font-semibold text-base pt-1.5 border-t border-ink/10">
                  <span>Total</span>
                  <span>{euros(total)}</span>
                </div>
              </div>

              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full rounded-full bg-ink text-cream py-3.5 font-semibold hover:opacity-90 transition"
              >
                Passer commande →
              </button>
              <p className="text-[11px] text-center text-muted-foreground">
                Les conditions, frais et dates de livraison de la première série
                seront confirmés avant l’ouverture commerciale.
              </p>
            </div>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>

      {checkoutOpen && (
        <CheckoutOverlay total={total} onClose={() => setCheckoutOpen(false)} />
      )}
    </Sheet>
  );
}

// Correspondance simplifiée entre principales villes françaises et codes postaux.
const FR_POSTAL_CODE_CITIES: Record<string, string> = {
  "75001": "Paris",
  "75002": "Paris",
  "75003": "Paris",
  "75004": "Paris",
  "75005": "Paris",
  "75006": "Paris",
  "75007": "Paris",
  "75008": "Paris",
  "75009": "Paris",
  "75010": "Paris",
  "75011": "Paris",
  "75012": "Paris",
  "75013": "Paris",
  "75014": "Paris",
  "75015": "Paris",
  "75016": "Paris",
  "75017": "Paris",
  "75018": "Paris",
  "75019": "Paris",
  "75020": "Paris",
  "69001": "Lyon",
  "69002": "Lyon",
  "69003": "Lyon",
  "13001": "Marseille",
  "13002": "Marseille",
  "31000": "Toulouse",
  "59000": "Lille",
  "67000": "Strasbourg",
  "33000": "Bordeaux",
  "44000": "Nantes",
  "06000": "Nice",
  "34000": "Montpellier",
  "67100": "Strasbourg",
};

// Configuration des frais de livraison internationaux.
const INTERNATIONAL_SHIPPING_COSTS: Record<
  string,
  { cost: number; info: string }
> = {
  France: { cost: 0, info: "Livraison gratuite" },
  Belgique: { cost: 9.9, info: "Livraison 9.9€" },
  Belgium: { cost: 9.9, info: "Livraison 9.9€" },
  Luxembourg: { cost: 9.9, info: "Livraison 9.9€" },
  Allemagne: { cost: 14.9, info: "Livraison 14.9€" },
  Deutschland: { cost: 14.9, info: "Livraison 14.9€" },
  Germany: { cost: 14.9, info: "Livraison 14.9€" },
  Suisse: { cost: 19.9, info: "Livraison 19.9€" },
  Switzerland: { cost: 19.9, info: "Livraison 19.9€" },
  Espagne: { cost: 14.9, info: "Livraison 14.9€" },
  Spain: { cost: 14.9, info: "Livraison 14.9€" },
  Italie: { cost: 14.9, info: "Livraison 14.9€" },
  Italy: { cost: 14.9, info: "Livraison 14.9€" },
  Portugal: { cost: 14.9, info: "Livraison 14.9€" },
  "Royaume-Uni": { cost: 19.9, info: "Livraison 19.9€" },
  UK: { cost: 19.9, info: "Livraison 19.9€" },
  "United Kingdom": { cost: 19.9, info: "Livraison 19.9€" },
};

const COUNTRIES_SELECT = [
  { value: "France", label: "France" },
  { value: "Belgique", label: "Belgique" },
  { value: "Luxembourg", label: "Luxembourg" },
  { value: "Allemagne", label: "Allemagne" },
  { value: "Suisse", label: "Suisse" },
  { value: "Espagne", label: "Espagne" },
  { value: "Italie", label: "Italie" },
  { value: "Portugal", label: "Portugal" },
  { value: "Royaume-Uni", label: "Royaume-Uni" },
  { value: "Autre", label: "Autre pays" },
];

const COUNTRY_DIAL_CODES: Record<string, string> = {
  France: "+33",
  Belgique: "+32",
  Luxembourg: "+352",
  Allemagne: "+49",
  Suisse: "+41",
  Espagne: "+34",
  Italie: "+39",
  Portugal: "+351",
  "Royaume-Uni": "+44",
  Autre: "+",
};

function CheckoutOverlay({
  total,
  onClose,
}: {
  total: number;
  onClose: () => void;
}) {
  const { lineItems, promoCode, discount } = useCart();
  const createCheckout = useServerFn(createStripeCheckoutSession);
  const [placing, setPlacing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+33");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("France");
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingInfo, setShippingInfo] = useState("Livraison gratuite");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // Update shipping cost when country changes
    const updateShipping = () => {
      const shipping = INTERNATIONAL_SHIPPING_COSTS[country] || {
        cost: 29.9,
        info: "Livraison 29.9€",
      };
      setShippingCost(shipping.cost);
      setShippingInfo(shipping.info);
    };

    updateShipping();
    // Update phone prefix when country changes
    const prefix = COUNTRY_DIAL_CODES[country] || "+";
    setPhonePrefix(prefix);
  }, [country]);

  useEffect(() => {
    // Auto-fill user info if logged in
    const loadUserProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setEmail(session.user.email || "");

        const userName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          "";
        if (userName) setName(userName);

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          if (profile.full_name && !userName) setName(profile.full_name);
          if (profile.phone) {
            // Try to extract prefix from phone
            if (profile.phone.startsWith("+")) {
              const phoneNumber = profile.phone;
              if (phoneNumber.startsWith("+33")) {
                setPhonePrefix("+33");
                setPhone(phoneNumber.replace("+33", ""));
              } else {
                setPhonePrefix(phoneNumber.slice(0, phoneNumber.length - 9));
                setPhone(phoneNumber.slice(phoneNumber.length - 9));
              }
            } else {
              setPhone(profile.phone);
            }
          }
          if (profile.address) setAddress(profile.address);
          if (profile.city) setCity(profile.city);
          if (profile.postal_code) setPostalCode(profile.postal_code);
          if (profile.country) {
            setCountry(profile.country);
          }
        }
      }
    };
    loadUserProfile();
  }, []);

  useEffect(() => {
    // France postal code to city lookup
    if (country === "France" && postalCode.length >= 5) {
      const formattedPostal = postalCode.trim();
      if (FR_POSTAL_CODE_CITIES[formattedPostal]) {
        setCity(FR_POSTAL_CODE_CITIES[formattedPostal]);
      } else if (formattedPostal.length === 5) {
        // Try to find matching city based on first 3 digits
        const firstTwo = formattedPostal.slice(0, 2);
        // Simple fallback logic
        if (firstTwo === "75") setCity("Paris");
        else if (firstTwo === "69") setCity("Lyon");
        else if (firstTwo === "13") setCity("Marseille");
        else if (firstTwo === "59") setCity("Lille");
        else if (firstTwo === "33") setCity("Bordeaux");
        else if (firstTwo === "44") setCity("Nantes");
        else if (firstTwo === "31") setCity("Toulouse");
        else if (firstTwo === "67") setCity("Strasbourg");
      }
    }
  }, [postalCode, country]);

  const handleConfirm = async () => {
    if (
      !name ||
      !email ||
      !phone ||
      !address ||
      !city ||
      !postalCode ||
      !country
    ) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      setPlacing(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const result = await createCheckout({
        data: {
          accessToken: session?.access_token,
          items: lineItems.map((item) => ({
            editionId: item.edition.id,
            quantity: item.qty,
          })),
          promoCode,
          shipping: {
            name,
            email,
            phone: phonePrefix + phone,
            address,
            city,
            postalCode,
            country,
          },
        },
      });
      window.location.assign(result.url);
    } catch (error) {
      console.error("Stripe checkout error:", error);
      toast.error(
        (error as Error)?.message || "Impossible d'ouvrir le paiement Stripe",
      );
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="font-display font-semibold text-lg">
          Finaliser la commande
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Remplissez vos informations pour finaliser votre commande.
        </p>
        <div className="mt-4 space-y-2.5">
          <input
            placeholder="Nom et prénom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30"
          />
          <input
            placeholder="Adresse e-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30"
          />

          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-1">
              <select
                value={phonePrefix}
                onChange={(e) => setPhonePrefix(e.target.value)}
                className="w-full rounded-xl border border-ink/15 px-2 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30 bg-white"
              >
                {Object.entries(COUNTRY_DIAL_CODES).map(
                  ([countryName, code]) => (
                    <option key={countryName} value={code}>
                      {code}
                    </option>
                  ),
                )}
              </select>
            </div>
            <input
              placeholder="Téléphone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-2 rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30"
            />
          </div>

          <input
            placeholder="Adresse de livraison"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30"
          />

          <div className="grid grid-cols-2 gap-2.5">
            <input
              placeholder="Code postal"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30"
            />
            <input
              placeholder="Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30"
            />
          </div>

          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30 bg-white"
          >
            {COUNTRIES_SELECT.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {country !== "France" && (
            <div className="mt-1 p-3 rounded-xl bg-orange-50 text-orange-700 text-xs">
              ℹ️ {shippingInfo} pour {country}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Sous-total</span>
            <span>{euros(total)}</span>
          </div>
          {shippingCost > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Livraison</span>
              <span>{euros(shippingCost)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-primary">
              <span>Réduction</span>
              <span>−{euros(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-display font-semibold text-base pt-1.5 border-t border-ink/10">
            <span>Total</span>
            <span>{euros(total + shippingCost)}</span>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={placing}
          className="mt-4 w-full rounded-full bg-ink text-cream py-3 font-semibold hover:opacity-90 transition disabled:opacity-60"
        >
          {placing ? "Traitement…" : "Confirmer et payer"}
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full text-xs text-muted-foreground hover:text-ink"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
