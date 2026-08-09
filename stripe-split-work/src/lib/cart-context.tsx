// ==============================================
// JASPER E-COMMERCE - CART CONTEXT
// ==============================================
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { EDITIONS, type Edition } from '@/components/site/editions';
import { validatePromoCode } from './promoService';
import { ShippingZone, calculateShippingCost, calculateOrderTotal } from './stripeService';

export type CartItem = {
    editionId: string;
    qty: number;
};

export type PromoResult = {
    valid: boolean;
    message: string;
    percentOff?: number;
    id?: number;
};

type CartContextValue = {
    items: CartItem[];
    isOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    addItem: (editionId: string, qty?: number) => void;
    removeItem: (editionId: string) => void;
    setQty: (editionId: string, qty: number) => void;
    promoCode: string | null;
    promoMessage: string | null;
    promoId: number | null;
    applyPromoCode: (code: string) => Promise<PromoResult>;
    clearPromoCode: () => void;
    clearCart: () => void;
    count: number;
    subtotal: number;
    discount: number;
    total: number;
    lineItems: { edition: Edition; qty: number; lineTotal: number }[];
    // Checkout-specific
    shippingZone: ShippingZone;
    setShippingZone: (zone: ShippingZone) => void;
    shippingRates: Array<{
        zone: string;
        min_weight_grams: number;
        max_weight_grams: number | null;
        base_price: number;
        price_per_kg: number;
    }>;
    setShippingRates: (rates: any[]) => void;
    calculateOrderTotals: () => ReturnType<typeof calculateOrderTotal>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [promoCode, setPromoCode] = useState<string | null>(null);
    const [promoMessage, setPromoMessage] = useState<string | null>(null);
    const [promoId, setPromoId] = useState<number | null>(null);
    const [percentOff, setPercentOff] = useState<number>(0);
    const [shippingZone, setShippingZone] = useState<ShippingZone>('france');
    const [shippingRates, setShippingRates] = useState<any[]>([]);

    const openCart = useCallback(() => setIsOpen(true), []);
    const closeCart = useCallback(() => setIsOpen(false), []);

    const addItem = useCallback((editionId: string, qty = 1) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.editionId === editionId);
            if (existing) {
                return prev.map((i) =>
                    i.editionId === editionId ? { ...i, qty: i.qty + qty } : i
                );
            }
            return [...prev, { editionId, qty }];
        });
        setIsOpen(true);
    }, []);

    const removeItem = useCallback((editionId: string) => {
        setItems((prev) => prev.filter((i) => i.editionId !== editionId));
    }, []);

    const setQty = useCallback((editionId: string, qty: number) => {
        setItems((prev) =>
            qty <= 0
                ? prev.filter((i) => i.editionId !== editionId)
                : prev.map((i) => (i.editionId === editionId ? { ...i, qty } : i))
        );
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        clearPromoCode();
    }, []);

    const applyPromoCode = useCallback(async (code: string): Promise<PromoResult> => {
        const result = await validatePromoCode(code);
        if (result.valid) {
            setPromoCode(code.trim().toUpperCase());
            setPromoMessage(result.message);
            setPromoId(result.id || null);
            setPercentOff(result.percentOff || 0);
        }
        return result;
    }, []);

    const clearPromoCode = useCallback(() => {
        setPromoCode(null);
        setPromoMessage(null);
        setPromoId(null);
        setPercentOff(0);
    }, []);

    const lineItems = useMemo(() =>
        items
            .map((i) => {
                const edition = EDITIONS.find((e) => e.id === i.editionId);
                if (!edition) return null;
                return {
                    edition,
                    qty: i.qty,
                    lineTotal: edition.price * i.qty,
                };
            })
            .filter((x): x is { edition: Edition; qty: number; lineTotal: number } => x !== null),
        [items]
    );

    const subtotal = useMemo(() =>
        lineItems.reduce((sum, li) => sum + li.lineTotal, 0),
        [lineItems]
    );

    const discount = useMemo(() =>
        Math.round(subtotal * (percentOff / 100) * 100) / 100,
        [subtotal, percentOff]
    );

    const total = useMemo(() =>
        Math.max(0, subtotal - discount),
        [subtotal, discount]
    );

    const count = useMemo(() =>
        items.reduce((sum, i) => sum + i.qty, 0),
        [items]
    );

    const calculateOrderTotals = useCallback(() => {
        // Calculate total weight for shipping (default: 500g per item)
        const totalWeightGrams = lineItems.reduce((sum, li) =>
            sum + (li.edition.weight_grams || 500) * li.qty, 0
        );

        const shippingCost = calculateShippingCost(
            shippingZone,
            totalWeightGrams,
            shippingRates
        );

        return calculateOrderTotal(subtotal, shippingCost, percentOff);
    }, [subtotal, percentOff, shippingZone, shippingRates, lineItems]);

    const value: CartContextValue = {
        items,
        isOpen,
        openCart,
        closeCart,
        addItem,
        removeItem,
        setQty,
        promoCode,
        promoMessage,
        promoId,
        applyPromoCode,
        clearPromoCode,
        clearCart,
        count,
        subtotal,
        discount,
        total,
        lineItems,
        shippingZone,
        setShippingZone,
        shippingRates,
        setShippingRates,
        calculateOrderTotals,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within a CartProvider');
    return ctx;
}
