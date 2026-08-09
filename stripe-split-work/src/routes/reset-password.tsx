import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, RefreshCw } from "lucide-react";

import { supabase } from "@/lib/supabase";

function ResetPasswordComponent() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;
    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !session) return;
      setSessionReady(true);
      setChecking(false);
    });

    async function checkRecoverySession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setSessionReady(true);
        setChecking(false);
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (!error) {
          setSessionReady(true);
          setChecking(false);
          return;
        }
      }

      // Give the client a moment to consume legacy hash-based recovery links.
      window.setTimeout(() => {
        if (!active) return;
        setChecking(false);
      }, 1200);
    }

    void checkRecoverySession();
    return () => {
      active = false;
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 10) {
      alert(
        "Le mot de passe doit contenir au moins 10 caractères 密码至少需要10个字符",
      );
      return;
    }
    if (password !== confirmation) {
      alert("Les mots de passe sont différents 两次输入的密码不一致");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }

    setCompleted(true);
    await supabase.auth.signOut();
    window.setTimeout(() => void navigate({ to: "/login" }), 1400);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            {completed ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <KeyRound className="h-8 w-8" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            Réinitialiser le mot de passe 重设密码
          </h1>
        </div>

        {checking ? (
          <div className="py-10 text-center text-sm text-gray-500">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
            Vérification du lien 正在验证链接
          </div>
        ) : completed ? (
          <div className="py-10 text-center">
            <p className="font-semibold text-emerald-700">
              Mot de passe modifié 密码修改成功
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Retour à la connexion 正在返回登录页
            </p>
          </div>
        ) : !sessionReady ? (
          <div className="py-8 text-center">
            <p className="font-semibold text-red-700">
              Lien invalide ou expiré 链接无效或已过期
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Demandez un nouveau lien depuis la page de connexion
              请在登录页重新发送链接
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block font-semibold text-amber-700 underline underline-offset-2"
            >
              Retour à la connexion 返回登录
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              Nouveau mot de passe 新密码
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Confirmer le mot de passe 确认新密码
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-semibold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
            >
              {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
              Enregistrer le nouveau mot de passe 保存新密码
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordComponent,
});
