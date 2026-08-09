import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export function NewsletterForm({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Merci de renseigner un e-mail valide.");
      return;
    }
    setSending(true);
    
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: email.trim() });
      
      if (error) {
        if (error.code === '23505') { // Unique violation - duplicate email
          toast.warning("Cet e-mail est déjà abonné !");
        } else {
          throw error;
        }
      } else {
        toast.success("Merci ! Vous recevrez nos conseils qualité de l'air.");
      }
      
      setEmail("");
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast.error("Erreur lors de l'inscription à la newsletter.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`}>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Votre e-mail"
        className="w-40 sm:w-48 rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ink/30"
      />
      <button
        type="submit"
        disabled={sending}
        className="rounded-full bg-ink text-cream px-3.5 py-1.5 text-xs font-semibold hover:opacity-90 transition disabled:opacity-60 whitespace-nowrap"
      >
        {sending ? "…" : "S'abonner"}
      </button>
    </form>
  );
}
