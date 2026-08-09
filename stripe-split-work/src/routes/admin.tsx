import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { Session } from "@supabase/supabase-js";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  KeyRound,
  LogOut,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Split,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProducts, updateProductPrice } from "@/lib/productService";
import {
  getAllOrders,
  getDividendDistributions,
  getFundPool,
} from "@/lib/orderService";
import {
  createStripeConnectOnboardingLink,
  distributeAvailableStripeFunds,
  getStripeConnectStatus,
  processStripeRefund,
} from "@/lib/stripeFunctions";

type ActiveTab = "overview" | "orders" | "products" | "refunds" | "account";

type ConnectStatus = Awaited<ReturnType<typeof getStripeConnectStatus>>;

type Product = { id: number; name: string; price: number };
type Refund = {
  id: number;
  order_id: number;
  amount: number;
  reason: string | null;
  status: string;
};
type Order = {
  id: number;
  status: string;
  total_amount: number;
  shipping_name: string;
  shipping_email: string;
  created_at: string;
  refunds?: Refund[];
};
type Fund = {
  id: number;
  order_id: number;
  amount: number;
  status: string;
  frozen_until: string;
  distributed_at: string | null;
};
type Dividend = {
  id: number;
  total_amount: number;
  admin1_share: number;
  admin2_share: number;
  status: string;
  error_message?: string | null;
  created_at: string;
};
type RefundWithOrder = Refund & { order: Order };

const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

const date = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const orderStatus: Record<string, string> = {
  pending: "En attente  待处理",
  paid: "Payée  已支付",
  shipped: "Expédiée  已发货",
  delivered: "Livrée  已送达",
  cancelled: "Annulée  已取消",
  refunded: "Remboursée  已退款",
};

function AdminComponent() {
  const navigate = useNavigate();
  const getConnectStatus = useServerFn(getStripeConnectStatus);
  const createOnboardingLink = useServerFn(createStripeConnectOnboardingLink);
  const distributeFunds = useServerFn(distributeAvailableStripeFunds);
  const refundPayment = useServerFn(processStripeRefund);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [fundPool, setFundPool] = useState<Fund[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connectError, setConnectError] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [refundBusy, setRefundBusy] = useState<number | null>(null);
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    void checkAuth();
    // L'authentification est volontairement vérifiée une seule fois au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      await navigate({ to: "/login" });
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .single();
    if (profile?.role !== "admin") {
      await navigate({ to: "/" });
      return;
    }
    setSession(data.session);
    await loadAllData(data.session.access_token);
  }

  async function loadAllData(accessToken = session?.access_token) {
    if (!accessToken) return;
    setRefreshing(true);
    try {
      const [productsData, ordersData, fundsData, dividendsData] =
        await Promise.all([
          getProducts(),
          getAllOrders(),
          getFundPool(),
          getDividendDistributions(),
        ]);
      setProducts((productsData || []) as Product[]);
      setOrders((ordersData || []) as Order[]);
      setFundPool((fundsData || []) as Fund[]);
      setDividends((dividendsData || []) as Dividend[]);
      try {
        const stripeStatus = await getConnectStatus({ data: { accessToken } });
        setConnect(stripeStatus);
        setConnectError("");
      } catch (error) {
        setConnect(null);
        setConnectError(
          error instanceof Error
            ? error.message
            : "Configuration Stripe indisponible  Stripe 配置不可用",
        );
      }
    } catch (error) {
      console.error("Admin data loading failed", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  }

  async function handlePriceChange(id: number, price: number) {
    if (!Number.isFinite(price) || price <= 0) {
      alert("Prix invalide  价格无效");
      return;
    }
    try {
      await updateProductPrice(id, price);
      await loadAllData();
    } catch {
      alert("Mise à jour impossible  更新失败");
    }
  }

  async function handleDistribution() {
    if (!session || distributing) return;
    if (
      !confirm(
        "Confirmer la répartition nette à 50 %  50 % ?\n确认将 Stripe 净入账五五分成吗？",
      )
    )
      return;
    setDistributing(true);
    try {
      const result = await distributeFunds({
        data: { accessToken: session.access_token },
      });
      alert(
        `Répartition terminée  分配完成\nAdmin 1  管理员 1  ${money(result.admin1)}\nAdmin 2  管理员 2  ${money(result.admin2)}`,
      );
      await loadAllData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Échec de la répartition  分配失败",
      );
      await loadAllData();
    } finally {
      setDistributing(false);
    }
  }

  async function handleConnectOnboarding() {
    if (!session || onboardingBusy) return;
    setOnboardingBusy(true);
    try {
      const result = await createOnboardingLink({
        data: { accessToken: session.access_token },
      });
      window.location.assign(result.url);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Ouverture de Stripe impossible 无法打开 Stripe 验证",
      );
      setOnboardingBusy(false);
    }
  }

  async function handlePasswordChange(event: React.FormEvent) {
    event.preventDefault();
    if (passwordBusy) return;
    if (newPassword.length < 10) {
      alert(
        "Le mot de passe doit contenir au moins 10 caractères 密码至少需要10个字符",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Les mots de passe sont différents 两次输入的密码不一致");
      return;
    }
    setPasswordBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    alert("Mot de passe modifié 密码已修改");
  }

  async function handleRefund(refundId: number, approve: boolean) {
    if (!session || refundBusy) return;
    const message = approve
      ? "Confirmer le remboursement Stripe ?\n确认 Stripe 退款吗？"
      : "Refuser cette demande ?\n拒绝此退款申请吗？";
    if (!confirm(message)) return;
    setRefundBusy(refundId);
    try {
      await refundPayment({
        data: { accessToken: session.access_token, refundId, approve },
      });
      await loadAllData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Traitement impossible  处理失败",
      );
    } finally {
      setRefundBusy(null);
    }
  }

  const totals = useMemo(() => {
    const frozen = fundPool
      .filter((fund) => fund.status === "frozen")
      .reduce((sum, fund) => sum + Number(fund.amount), 0);
    const available = fundPool
      .filter((fund) => fund.status === "available" && !fund.distributed_at)
      .reduce((sum, fund) => sum + Number(fund.amount), 0);
    const paidSales = orders
      .filter((order) =>
        ["paid", "shipped", "delivered"].includes(order.status),
      )
      .reduce((sum, order) => sum + Number(order.total_amount), 0);
    return { frozen, available, paidSales };
  }, [fundPool, orders]);

  const pendingRefunds: RefundWithOrder[] = orders.flatMap((order) =>
    (order.refunds || []).map((refund) => ({ ...refund, order })),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f5ef] flex items-center justify-center">
        <div className="text-center text-slate-600">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin" />
          Chargement 加载中
        </div>
      </div>
    );
  }

  const tabs: Array<{ key: ActiveTab; label: string; icon: typeof Split }> = [
    { key: "overview", label: "Répartition  分账", icon: Split },
    { key: "orders", label: "Commandes  订单", icon: ShoppingBag },
    { key: "products", label: "Produits  产品", icon: Package },
    {
      key: "refunds",
      label: `Remboursements  退款 ${pendingRefunds.filter((item) => item.status === "pending").length}`,
      icon: RotateCcw,
    },
    {
      key: "account",
      label: "Compte et mot de passe  账户和密码",
      icon: KeyRound,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f5ef] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              ← Accueil 返回首页
            </Link>
            <h1 className="mt-2 text-2xl font-bold">
              Administration Jasper Jasper 管理后台
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Paiements, répartition et suivi en un seul endroit
              支付、分账和跟踪一目了然
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {session?.user.email}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadAllData()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Actualiser 刷新
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" /> Déconnexion 退出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Ventes payées  已支付销售额"
            value={money(totals.paidSales)}
          />
          <StatCard
            label="Fonds gelés  冻结资金"
            value={money(totals.frozen)}
            tone="amber"
          />
          <StatCard
            label="Brut arrivé à échéance  已到期总额"
            value={money(totals.available)}
            tone="green"
          />
          <StatCard
            label="Solde Stripe disponible  Stripe 可用余额"
            value={connect ? money(connect.availableBalance) : "—"}
            tone="blue"
          />
        </div>

        <nav className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">
                      Stripe Connect 关联账号
                    </p>
                    <h2 className="mt-2 text-xl font-bold">
                      Répartition nette 50 % 50 % 净入账五五分成
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      Les frais Stripe sont retirés avant le partage. En cas de
                      centime impair, le second compte reçoit le centime
                      restant.
                      {"  "}Stripe
                      手续费先扣除，净额再平分；如遇单数分，第二个账号多得一分。
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${connect?.mode === "live" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {connect?.mode === "live"
                      ? "Mode réel  正式模式"
                      : "Mode test  测试模式"}
                  </span>
                </div>

                {connectError ? (
                  <div className="mt-5 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <strong>Configuration requise 需要配置</strong>
                      <div className="mt-1">{connectError}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <AccountCard
                      number={connect?.slot}
                      status={connect?.ownAccount}
                      activating={onboardingBusy}
                      onActivate={handleConnectOnboarding}
                    />
                    <PrivatePeerCard ready={connect?.otherReady === true} />
                  </div>
                )}

                <button
                  onClick={handleDistribution}
                  disabled={
                    distributing || !connect?.ready || totals.available <= 0
                  }
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {distributing ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Split className="h-5 w-5" />
                  )}
                  {distributing
                    ? "Répartition en cours  正在分配"
                    : "Distribuer les fonds arrivés à échéance  分配已到期资金"}
                </button>
                <p className="mt-3 text-center text-xs text-slate-400">
                  Le bouton reprend automatiquement un transfert interrompu sans
                  payer deux fois 中断后可安全重试，不会重复转账
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="font-bold">Comment procéder 操作步骤</h2>
                <div className="mt-5 space-y-5">
                  <Step
                    number="1"
                    title="Vérifier les deux comptes  检查两个账号"
                    text="Les deux voyants doivent être verts  两个状态都应显示绿色"
                  />
                  <Step
                    number="2"
                    title="Attendre la fin du gel  等待冻结期结束"
                    text="Les paiements deviennent distribuables après 14 jours  支付完成14天后可分配"
                  />
                  <Step
                    number="3"
                    title="Cliquer une seule fois  点击一次"
                    text="Le système calcule le net et envoie exactement 50 % à chacun  系统自动计算净额并五五分成"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold">
                Historique des répartitions 分账记录
              </h2>
              {dividends.length === 0 ? (
                <Empty text="Aucune répartition pour le moment  暂无分账记录" />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="pb-3">Date 日期</th>
                        <th className="pb-3">Net total 净额</th>
                        <th className="pb-3">Admin 1 管理员 1</th>
                        <th className="pb-3">Admin 2 管理员 2</th>
                        <th className="pb-3">Statut 状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dividends.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="py-3">{date(item.created_at)}</td>
                          <td className="py-3 font-semibold">
                            {money(item.total_amount)}
                          </td>
                          <td className="py-3">{money(item.admin1_share)}</td>
                          <td className="py-3">{money(item.admin2_share)}</td>
                          <td className="py-3">
                            <DistributionStatus item={item} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold">Détail des fonds 资金明细</h2>
              {fundPool.length === 0 ? (
                <Empty text="Aucun paiement Stripe reçu  尚未收到 Stripe 支付" />
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {fundPool.map((fund) => (
                    <div
                      key={fund.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
                    >
                      <div>
                        <div className="font-semibold">
                          Commande #{fund.order_id} 订单
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Fin du gel 解冻日期 {date(fund.frozen_until)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{money(fund.amount)}</div>
                        <FundStatus status={fund.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "orders" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold">Toutes les commandes 所有订单</h2>
            {orders.length === 0 ? (
              <Empty text="Aucune commande  暂无订单" />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="pb-3">Commande 订单</th>
                      <th className="pb-3">Client 客户</th>
                      <th className="pb-3">Montant 金额</th>
                      <th className="pb-3">Statut 状态</th>
                      <th className="pb-3">Date 日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-slate-100">
                        <td className="py-3 font-semibold">#{order.id}</td>
                        <td className="py-3">
                          <div>{order.shipping_name}</div>
                          <div className="text-xs text-slate-400">
                            {order.shipping_email}
                          </div>
                        </td>
                        <td className="py-3 font-semibold">
                          {money(order.total_amount)}
                        </td>
                        <td className="py-3">
                          {orderStatus[order.status] || order.status}
                        </td>
                        <td className="py-3">{date(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === "products" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold">Prix des produits 产品价格</h2>
            <p className="mt-1 text-sm text-slate-500">
              Modifiez un prix puis cliquez ailleurs pour enregistrer
              修改价格后点击其他位置即可保存
            </p>
            <div className="mt-5 space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="font-semibold">{product.name}</div>
                  <label className="flex items-center gap-2 text-sm text-slate-500">
                    Prix 价格
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={product.price}
                      onBlur={(event) =>
                        handlePriceChange(
                          product.id,
                          Number(event.target.value),
                        )
                      }
                      className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-right text-slate-900"
                    />{" "}
                    €
                  </label>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "refunds" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold">
              Demandes de remboursement 退款申请
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Un remboursement est bloqué si les fonds ont déjà été distribués
              如资金已分账，退款会被阻止
            </p>
            {pendingRefunds.length === 0 ? (
              <Empty text="Aucune demande  暂无申请" />
            ) : (
              <div className="mt-5 space-y-3">
                {pendingRefunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-semibold">
                          Commande #{refund.order_id} 订单
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Motif 原因 {refund.reason || "—"}
                        </div>
                      </div>
                      <div className="font-bold">{money(refund.amount)}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        {refund.status === "pending"
                          ? "En attente  待处理"
                          : refund.status === "approved"
                            ? "Approuvée  已批准"
                            : "Refusée  已拒绝"}
                      </span>
                      {refund.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            disabled={refundBusy === refund.id}
                            onClick={() => handleRefund(refund.id, false)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                          >
                            Refuser 拒绝
                          </button>
                          <button
                            disabled={refundBusy === refund.id}
                            onClick={() => handleRefund(refund.id, true)}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            Rembourser 退款
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "account" && (
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold">
                Mon compte administrateur 我的管理员账户
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Chaque administrateur possède une connexion et un compte Stripe
                séparés 每位管理员使用独立登录和独立 Stripe 收款账户
              </p>
              <dl className="mt-5 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">E-mail 邮箱</dt>
                  <dd className="mt-1 font-semibold">{session?.user.email}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Compte Stripe Stripe 账户</dt>
                  <dd className="mt-1 font-semibold">
                    Administrateur {connect?.slot ?? "—"} 管理员
                  </dd>
                </div>
              </dl>
            </div>

            <form
              onSubmit={handlePasswordChange}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-lg font-bold">
                Changer le mot de passe 修改登录密码
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Dix caractères minimum 至少10个字符
              </p>
              <label className="mt-5 block text-sm font-semibold">
                Nouveau mot de passe 新密码
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-slate-400"
                />
              </label>
              <label className="mt-4 block text-sm font-semibold">
                Confirmer le mot de passe 确认新密码
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-slate-400"
                />
              </label>
              <button
                type="submit"
                disabled={passwordBusy}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {passwordBusy && <RefreshCw className="h-4 w-4 animate-spin" />}
                Enregistrer le mot de passe 保存新密码
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "amber" | "green" | "blue";
}) {
  const colors = {
    slate: "text-slate-900",
    amber: "text-amber-700",
    green: "text-emerald-700",
    blue: "text-blue-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-bold ${colors[tone]}`}>{value}</div>
    </div>
  );
}

function AccountCard({
  number,
  status,
  activating,
  onActivate,
}: {
  number?: 1 | 2;
  status?: ConnectStatus["ownAccount"];
  activating: boolean;
  onActivate: () => void;
}) {
  const ready = status?.configured && status?.transfersActive;
  return (
    <div
      className={`rounded-xl border p-4 ${ready ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <WalletCards className="h-4 w-4" /> Mon compte Stripe 我的 Stripe 账户
        </div>
        {ready ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <CircleAlert className="h-5 w-5 text-red-600" />
        )}
      </div>
      <div className="mt-2 font-mono text-xs text-slate-500">
        {status?.account || "Non configuré  未配置"}
      </div>
      <div
        className={`mt-2 text-xs font-semibold ${ready ? "text-emerald-700" : "text-red-700"}`}
      >
        {ready ? "Transferts actifs  转账已启用" : "Action requise  需要处理"}
      </div>
      {!ready && status?.configured && (
        <button
          type="button"
          onClick={onActivate}
          disabled={activating}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {activating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
          {activating
            ? "Ouverture de Stripe  正在打开 Stripe"
            : `Activer mon compte ${number ?? ""}  完成我的账号验证`}
        </button>
      )}
    </div>
  );
}

function PrivatePeerCard({ ready }: { ready: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <WalletCards className="h-4 w-4" /> Autre administrateur 另一位管理员
        </div>
        {ready ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <Clock3 className="h-5 w-5 text-amber-600" />
        )}
      </div>
      <div className="mt-2 text-xs font-semibold text-slate-500">
        {ready
          ? "Compte prêt  账户已就绪"
          : "Activation en attente  等待对方完成验证"}
      </div>
      <div className="mt-2 text-xs text-slate-400">
        Informations privées et masquées 隐私信息已隐藏
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
        {number}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-1 text-sm leading-5 text-slate-500">{text}</div>
      </div>
    </div>
  );
}

function DistributionStatus({ item }: { item: Dividend }) {
  if (item.status === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" /> Terminée 已完成
      </span>
    );
  if (item.error_message)
    return (
      <span
        title={item.error_message}
        className="inline-flex items-center gap-1 text-xs font-bold text-red-700"
      >
        <CircleAlert className="h-4 w-4" /> À reprendre 需重试
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
      <Clock3 className="h-4 w-4" /> En cours 处理中
    </span>
  );
}

function FundStatus({ status }: { status: string }) {
  const labels: Record<string, string> = {
    frozen: "Gelé  冻结",
    available: "Disponible  可分配",
    distributed: "Distribué  已分配",
    refunded: "Remboursé  已退款",
  };
  return (
    <div className="mt-1 text-xs text-slate-500">
      {labels[status] || status}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-slate-400">{text}</div>;
}

export const Route = createFileRoute("/admin")({ component: AdminComponent });
