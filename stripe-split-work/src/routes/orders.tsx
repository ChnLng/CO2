import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';

type Order = any;
type OrderItem = any;
type ShippingInfo = any;
type AfterSales = any;

function OrdersComponent() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAfterSalesForm, setShowAfterSalesForm] = useState(false);
  const [afterSalesSubject, setAfterSalesSubject] = useState('');
  const [afterSalesDescription, setAfterSalesDescription] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    
    if (data.session) {
      await loadOrders(data.session.user.id);
    }
    
    setLoading(false);
  }

  async function loadOrders(userId: string) {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*, order_items(*), shipping_info(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatStatus(status: string | null) {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Payé', color: 'bg-blue-100 text-blue-800' },
      shipped: { label: 'Expédié', color: 'bg-purple-100 text-purple-800' },
      delivered: { label: 'Livré', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
      refunded: { label: 'Remboursé', color: 'bg-gray-100 text-gray-800' },
    };
    return statusMap[status || 'pending'] || statusMap.pending;
  }

  function formatShippingStatus(status: string | null) {
    const statusMap: Record<string, { label: string; color: string }> = {
      preparing: { label: 'En préparation', color: 'bg-yellow-100 text-yellow-800' },
      shipped: { label: 'Expédié', color: 'bg-blue-100 text-blue-800' },
      in_transit: { label: 'En transit', color: 'bg-purple-100 text-purple-800' },
      out_for_delivery: { label: 'En livraison', color: 'bg-orange-100 text-orange-800' },
      delivered: { label: 'Livré', color: 'bg-green-100 text-green-800' },
    };
    return statusMap[status || 'preparing'] || statusMap.preparing;
  }

  async function handleSubmitAfterSales(orderId: number) {
    if (!afterSalesSubject || !afterSalesDescription) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const { error } = await supabase.from('after_sales').insert({
        order_id: orderId,
        user_id: session.user.id,
        subject: afterSalesSubject,
        description: afterSalesDescription,
        status: 'pending'
      });

      if (error) throw error;

      alert('Demande de service après-vente soumise avec succès !');
      setShowAfterSalesForm(false);
      setAfterSalesSubject('');
      setAfterSalesDescription('');
    } catch (error) {
      console.error('Error submitting after sales:', error);
      alert('Erreur lors de la soumission de la demande');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-amber-100 text-center">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Veuillez vous connecter</h2>
          <p className="text-gray-600 mb-6">Vous devez être connecté pour voir vos commandes</p>
          <div className="flex gap-3 justify-center">
            <Link 
              to="/" 
              className="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Retour à l'accueil
            </Link>
            <Link 
              to="/login" 
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (selectedOrder) {
    const statusInfo = formatStatus(selectedOrder.status);
    const shippingInfo = selectedOrder.shipping_info?.[0];
    const shippingStatusInfo = shippingInfo ? formatShippingStatus(shippingInfo.status) : null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => setSelectedOrder(null)} 
              className="text-gray-600 hover:text-gray-800 mr-4"
            >
              ← Retour aux commandes
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                Commande #{selectedOrder.id}
              </h1>
              <p className="text-gray-500 mt-2">{formatDate(selectedOrder.created_at)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Statut de la commande</h2>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                {selectedOrder.total_amount?.toFixed(2)} €
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Informations de livraison</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Nom:</span> {selectedOrder.shipping_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.shipping_email}</p>
                  {selectedOrder.shipping_phone && (
                    <p><span className="font-medium">Téléphone:</span> {selectedOrder.shipping_phone}</p>
                  )}
                  <p><span className="font-medium">Adresse:</span> {selectedOrder.shipping_address}</p>
                  <p>{selectedOrder.shipping_postal_code} {selectedOrder.shipping_city}, {selectedOrder.shipping_country}</p>
                </div>
              </div>

              {shippingStatusInfo && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Suivi de livraison</h3>
                  <div className="space-y-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold inline-block ${shippingStatusInfo.color}`}>
                      {shippingStatusInfo.label}
                    </span>
                    {shippingInfo.tracking_number && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Numéro de suivi:</span> {shippingInfo.tracking_number}
                      </p>
                    )}
                    {shippingInfo.carrier && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Transporteur:</span> {shippingInfo.carrier}
                      </p>
                    )}
                    {shippingInfo.estimated_delivery && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Livraison estimée:</span> {formatDate(shippingInfo.estimated_delivery)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-800 mb-4">Articles commandés</h3>
              <div className="space-y-3">
                {selectedOrder.order_items?.map((item: OrderItem) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800">{item.product_name}</p>
                      <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-800">{(item.product_price * item.quantity).toFixed(2)} €</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button 
                onClick={() => setShowAfterSalesForm(!showAfterSalesForm)}
                className="w-full md:w-auto px-6 py-3 bg-gray-100 text-gray-800 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                🛠️ Demander un service après-vente
              </button>

              {showAfterSalesForm && (
                <div className="mt-6 bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Formulaire de service après-vente</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sujet</label>
                      <input 
                        type="text"
                        value={afterSalesSubject}
                        onChange={(e) => setAfterSalesSubject(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400"
                        placeholder="Ex: Problème avec mon Jasper"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea 
                        value={afterSalesDescription}
                        onChange={(e) => setAfterSalesDescription(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400"
                        rows={4}
                        placeholder="Décrivez votre problème..."
                      />
                    </div>
                    <button 
                      onClick={() => handleSubmitAfterSales(selectedOrder.id)}
                      className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition"
                    >
                      Soumettre la demande
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link to="/" className="text-gray-600 hover:text-gray-800 mr-4">
            ← Retour à l'accueil
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
              Mes commandes
            </h1>
            <p className="text-gray-500 mt-2">{orders.length} commande{orders.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-12 text-center">
            <div className="text-6xl mb-4">🛍️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Pas encore de commande</h2>
            <p className="text-gray-500 mb-6">Allez choisir votre Jasper préféré !</p>
            <Link 
              to="/" 
              className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition"
            >
              Commencer mes achats
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = formatStatus(order.status);
              return (
                <div 
                  key={order.id} 
                  className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6 hover:shadow-2xl transition cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📦</span>
                        <div>
                          <h3 className="font-bold text-gray-800">Commande #{order.id}</h3>
                          <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-gray-600">
                        <p>📍 {order.shipping_address}</p>
                        {order.order_items?.length > 0 && (
                          <p>📦 {order.order_items.length} article{order.order_items.length !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                        {order.total_amount?.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/orders')({
  component: OrdersComponent,
});
