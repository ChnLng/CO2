import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

function RegisterComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<
    "google" | "github" | null
  >(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      alert("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      alert(
        "Inscription réussie ! Veuillez vérifier votre email pour confirmer, puis connectez-vous.",
      );
      navigate({ to: "/login" });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setOauthProvider(provider);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url)
        throw new Error("Le service de connexion est indisponible.");
      window.location.assign(data.url);
    } catch (error: any) {
      alert(error.message);
      setOauthProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-amber-100">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-2xl text-white">🌟</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Créer un compte</h1>
          <p className="text-gray-500 mt-2">Rejoignez la famille Jasper</p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuthLogin("github")}
            disabled={loading || oauthProvider !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <span>🐙</span>
            <span className="text-gray-700">
              {oauthProvider === "github"
                ? "Redirection vers GitHub…"
                : "Continuer avec GitHub"}
            </span>
          </button>
          <button
            onClick={() => handleOAuthLogin("google")}
            disabled={loading || oauthProvider !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <span>🔵</span>
            <span className="text-gray-700">
              {oauthProvider === "google"
                ? "Redirection vers Google…"
                : "Continuer avec Google"}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-sm text-gray-400">
            Ou s'inscrire avec email
          </span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              placeholder="Au moins 6 caractères"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              placeholder="Répétez votre mot de passe"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-3 rounded-xl font-semibold hover:from-rose-600 hover:to-amber-600 transition disabled:opacity-50"
          >
            {loading ? "Inscription en cours..." : "Créer un compte"}
          </button>
        </form>

        <div className="mt-8 text-center space-y-3">
          <p className="text-sm text-gray-600">
            Déjà un compte ?{" "}
            <Link
              to="/login"
              className="text-rose-600 hover:text-rose-700 font-semibold underline underline-offset-2"
            >
              Se connecter
            </Link>
          </p>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/register")({
  component: RegisterComponent,
});
