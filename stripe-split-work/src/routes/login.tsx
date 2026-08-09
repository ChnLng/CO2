import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

function LoginComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profile?.role === "admin") {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/" });
      }
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Connexion impossible 无法登录",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "github" | "google") => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Connexion impossible 无法登录",
      );
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      alert("Saisissez d’abord votre e-mail 请先填写邮箱地址");
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );
    setResetLoading(false);

    // Keep the same response whether or not an account exists so the login
    // page cannot be used to discover registered e-mail addresses.
    if (error) console.error("Password reset request failed", error);
    alert(
      "Si ce compte existe, un lien de réinitialisation vient d’être envoyé 如果该账号存在，重设密码链接已发送",
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-amber-100">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-2xl text-white">✨</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            Content de vous revoir
          </h1>
          <p className="text-gray-500 mt-2">
            Connectez-vous à votre compte Jasper
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuthLogin("github")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <span>🐙</span>
            <span className="text-gray-700">Continuer avec GitHub</span>
          </button>
          <button
            onClick={() => handleOAuthLogin("google")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <span>🔵</span>
            <span className="text-gray-700">Continuer avec Google</span>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-sm text-gray-400">
            Ou se connecter avec email
          </span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || resetLoading}
                className="text-sm font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 disabled:opacity-50"
              >
                {resetLoading
                  ? "Envoi en cours  正在发送"
                  : "Mot de passe oublié  忘记密码"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-50"
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <div className="mt-8 text-center space-y-3">
          <p className="text-sm text-gray-600">
            Pas encore de compte?{" "}
            <Link
              to="/register"
              className="text-amber-600 hover:text-amber-700 font-semibold underline underline-offset-2"
            >
              Créer un compte
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

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});
