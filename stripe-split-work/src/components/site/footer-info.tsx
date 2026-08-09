import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// -----------------------------------------------------------------------
// Placeholder legal / support copy. This is realistic starting content for
// a French DTC hardware brand, written to be genuinely useful as a first
// draft — but it is still a template. Have it reviewed by a lawyer before
// publishing (RGPD wording, droit de rétractation, garantie légale, etc.
// must match your real company, address and processes).
// -----------------------------------------------------------------------

type FooterKey = "confidentialite" | "securite" | "guide" | "maj" | "contact";

const CONTENT: Record<Exclude<FooterKey, "contact">, { title: string; body: ReactNode }> = {
  confidentialite: {
    title: "Confidentialité",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Jasper collecte le minimum de données nécessaire pour traiter votre commande : identité, adresse de
          livraison, e-mail. Le capteur fonctionne hors ligne par défaut et ne transmet aucune donnée sans votre
          accord explicite.
        </p>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité
          de vos données. Vous pouvez exercer ces droits à tout moment depuis votre espace client ou en écrivant à{" "}
          <span className="font-medium text-ink">confidentialite@[votredomaine].fr</span>.
        </p>
        <p>Les données sont hébergées au sein de l'Union européenne. Aucune donnée n'est revendue à des tiers.</p>
      </div>
    ),
  },
  securite: {
    title: "Sécurité des données",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Les échanges avec notre site sont chiffrés (HTTPS/TLS). Les paiements sont traités par un prestataire
          certifié PCI-DSS : vos coordonnées bancaires ne transitent jamais par nos serveurs.
        </p>
        <p>
          Les comptes clients sont protégés par un mot de passe chiffré et, en option, une double authentification.
          L'accès aux données de commande est restreint à l'équipe support, sur autorisation.
        </p>
        <p>Le firmware du capteur est open-source et consultable publiquement pour vérification indépendante.</p>
      </div>
    ),
  },
  guide: {
    title: "Guide d'utilisation",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <ol className="list-decimal list-inside space-y-2">
          <li>Sortez Jasper de sa boîte et retirez le film de protection du ventre lumineux.</li>
          <li>Branchez le câble USB-C fourni. Le premier calibrage démarre automatiquement (environ 3 minutes).</li>
          <li>Posez Jasper dans la pièce à surveiller, à 1–2 mètres du sol, loin d'une fenêtre ouverte.</li>
          <li>Le ventre passe au vert : l'air est sain. À l'orange puis au rouge, ouvrez une fenêtre.</li>
          <li>Appuyez sur le bec pour entendre la valeur exacte en ppm.</li>
        </ol>
        <p>Un livret imprimé illustré est également fourni dans la boîte.</p>
      </div>
    ),
  },
  maj: {
    title: "Mises à jour",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Jasper reçoit des mises à jour de firmware gratuites pendant 5 ans, pour améliorer la précision de mesure
          et ajouter de nouvelles fonctionnalités (nouveaux sons, nouveaux seuils d'alerte, etc.).
        </p>
        <p>
          Aucune application n'est nécessaire : la mise à jour se fait en branchant Jasper à un ordinateur via le
          câble USB-C fourni, ou automatiquement si vous activez le Wi-Fi (optionnel).
        </p>
      </div>
    ),
  },
};

export function FooterInfoDialog({ item, onOpenChange }: { item: FooterKey; onOpenChange: (open: boolean) => void }) {
  if (item === "contact") {
    return <ContactDialogContent onOpenChange={onOpenChange} />;
  }
  const entry = CONTENT[item];
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="font-display font-semibold text-lg pr-6">{entry.title}</DialogPrimitive.Title>
          <div className="mt-3 max-h-[60vh] overflow-y-auto pr-1">{entry.body}</div>
          <DialogPrimitive.Close className="absolute right-5 top-5 h-8 w-8 rounded-full hover:bg-ink/5 flex items-center justify-center transition">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function ContactDialogContent({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [sending, setSending] = useState(false);
  const [type, setType] = useState("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          type: type,
          order_id: orderId.trim() ? parseInt(orderId.trim()) : null
        });
      
      if (error) {
        throw error;
      }
      
      onOpenChange(false);
      toast.success("Message envoyé — notre équipe vous répond sous 48h ouvrées.");
      
      // Reset form
      setName("");
      setEmail("");
      setMessage("");
      setOrderId("");
    } catch (error) {
      console.error("Contact message error:", error);
      toast.error("Erreur lors de l'envoi du message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="font-display font-semibold text-lg pr-6">Contact & SAV</DialogPrimitive.Title>
          <p className="mt-1 text-xs text-muted-foreground">
            Réponse sous 48h ouvrées · support@[votredomaine].fr · +33 (0)1 XX XX XX XX
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("general")}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${type === "general" ? "bg-ink text-cream" : "bg-ink/5 text-ink"}`}
              >
                Contact général
              </button>
              <button
                type="button"
                onClick={() => setType("sav")}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${type === "sav" ? "bg-ink text-cream" : "bg-ink/5 text-ink"}`}
              >
                SAV / Réparation
              </button>
            </div>
            
            <input 
              required 
              placeholder="Nom" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30" 
            />
            <input 
              required 
              type="email" 
              placeholder="E-mail" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30" 
            />
            
            {type === "sav" && (
              <input 
                type="text" 
                placeholder="Numéro de commande (optionnel)" 
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30" 
              />
            )}
            
            <textarea 
              required 
              placeholder="Votre message" 
              rows={4} 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ink/30" 
            />
            
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-full bg-ink text-cream py-3 font-semibold hover:opacity-90 transition disabled:opacity-60"
            >
              {sending ? "Envoi…" : "Envoyer le message"}
            </button>
          </form>
          <DialogPrimitive.Close className="absolute right-5 top-5 h-8 w-8 rounded-full hover:bg-ink/5 flex items-center justify-center transition">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export type { FooterKey };
