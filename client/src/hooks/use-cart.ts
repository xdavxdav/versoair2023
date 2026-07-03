import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Cart item shape (shared between localStorage and server)
 */
export interface CartItem {
  id?: number; // server-side ID (only for authenticated carts)
  item_type: "pack" | "print_product";
  item_id: number;
  item_name?: string;
  quantity: number;
  price_cents: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

interface LocalCart {
  items: CartItem[];
  created_at: string; // ISO string — for 30-day expiry
  updated_at: string;
}

const CART_STORAGE_KEY = "verso_cart";
const CART_EXPIRY_DAYS = 30;

// ────────────────────────────────────────────────────────────────────────────
// LocalStorage helpers
// ────────────────────────────────────────────────────────────────────────────

function readLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const cart: LocalCart = JSON.parse(raw);

    // Auto-purge if older than 30 days
    const createdAt = new Date(cart.created_at);
    const now = new Date();
    const diffDays =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > CART_EXPIRY_DAYS) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }

    return cart.items || [];
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartItem[]) {
  const existing = localStorage.getItem(CART_STORAGE_KEY);
  let createdAt = new Date().toISOString();
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      createdAt = parsed.created_at || createdAt;
    } catch {
      // ignore
    }
  }

  const cart: LocalCart = {
    items,
    created_at: createdAt,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function clearLocalCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
}

// ────────────────────────────────────────────────────────────────────────────
// Auth check helper (mirrors existing FSA pattern)
// ────────────────────────────────────────────────────────────────────────────

function getAuthToken(): string | null {
  return (
    localStorage.getItem("auth_token") || localStorage.getItem("authToken")
  );
}

function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// ────────────────────────────────────────────────────────────────────────────
// useCart Hook
// ────────────────────────────────────────────────────────────────────────────

export function useCart() {
  const queryClient = useQueryClient();
  const authed = isAuthenticated();

  // ─── Server cart (only when authenticated) ───
  const { data: serverCart, isLoading } = useQuery({
    queryKey: ["marketing", "cart"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch("/api/marketing/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load cart");
      const json = await res.json();
      return json.data as {
        items: CartItem[];
        total_cents: number;
        item_count: number;
      };
    },
    enabled: authed,
    staleTime: 30_000,
  });

  // ─── Local cart (for guests) ───
  const [localItems, setLocalItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!authed) {
      setLocalItems(readLocalCart());
    }
  }, [authed]);

  // Sync local state to localStorage
  const updateLocal = useCallback((items: CartItem[]) => {
    setLocalItems(items);
    writeLocalCart(items);
  }, []);

  // ─── Computed cart ───
  const items: CartItem[] = authed ? serverCart?.items || [] : localItems;
  const totalCents = items.reduce(
    (sum, i) => sum + i.price_cents * i.quantity,
    0,
  );
  const itemCount = items.length;

  // ─── Add to cart ───
  const addMutation = useMutation({
    mutationFn: async (item: {
      item_type: "pack" | "print_product";
      item_id: number;
      quantity?: number;
      metadata?: Record<string, any>;
    }) => {
      const token = getAuthToken();
      const res = await fetch("/api/marketing/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Failed to add to cart");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["marketing", "cart"] }),
  });

  const addItem = useCallback(
    async (item: {
      item_type: "pack" | "print_product";
      item_id: number;
      item_name?: string;
      price_cents: number;
      quantity?: number;
      metadata?: Record<string, any>;
    }) => {
      if (authed) {
        await addMutation.mutateAsync({
          item_type: item.item_type,
          item_id: item.item_id,
          quantity: item.quantity || 1,
          metadata: item.metadata,
        });
      } else {
        // Local cart
        const existing = localItems.find(
          (i) => i.item_type === item.item_type && i.item_id === item.item_id,
        );
        if (existing) {
          const updated = localItems.map((i) =>
            i.item_type === item.item_type && i.item_id === item.item_id
              ? { ...i, quantity: i.quantity + (item.quantity || 1) }
              : i,
          );
          updateLocal(updated);
        } else {
          updateLocal([
            ...localItems,
            {
              item_type: item.item_type,
              item_id: item.item_id,
              item_name: item.item_name,
              price_cents: item.price_cents,
              quantity: item.quantity || 1,
              metadata: item.metadata,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      }
    },
    [authed, localItems, updateLocal, addMutation],
  );

  // ─── Update quantity ───
  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      cartItemId,
      quantity,
    }: {
      cartItemId: number;
      quantity: number;
    }) => {
      const token = getAuthToken();
      const res = await fetch(`/api/marketing/cart/${cartItemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["marketing", "cart"] }),
  });

  const updateQuantity = useCallback(
    async (itemType: string, itemId: number, quantity: number) => {
      if (authed) {
        const cartItem = serverCart?.items.find(
          (i) => i.item_type === itemType && i.item_id === itemId,
        );
        if (cartItem?.id) {
          await updateQuantityMutation.mutateAsync({
            cartItemId: cartItem.id,
            quantity,
          });
        }
      } else {
        const updated = localItems.map((i) =>
          i.item_type === itemType && i.item_id === itemId
            ? { ...i, quantity: Math.max(1, quantity) }
            : i,
        );
        updateLocal(updated);
      }
    },
    [authed, serverCart, localItems, updateLocal, updateQuantityMutation],
  );

  // ─── Remove item ───
  const removeMutation = useMutation({
    mutationFn: async (cartItemId: number) => {
      const token = getAuthToken();
      const res = await fetch(`/api/marketing/cart/${cartItemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to remove");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["marketing", "cart"] }),
  });

  const removeItem = useCallback(
    async (itemType: string, itemId: number) => {
      if (authed) {
        const cartItem = serverCart?.items.find(
          (i) => i.item_type === itemType && i.item_id === itemId,
        );
        if (cartItem?.id) {
          await removeMutation.mutateAsync(cartItem.id);
        }
      } else {
        const updated = localItems.filter(
          (i) => !(i.item_type === itemType && i.item_id === itemId),
        );
        updateLocal(updated);
      }
    },
    [authed, serverCart, localItems, updateLocal, removeMutation],
  );

  // ─── Clear cart ───
  const clearMutation = useMutation({
    mutationFn: async () => {
      const token = getAuthToken();
      const res = await fetch("/api/marketing/cart", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to clear");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["marketing", "cart"] }),
  });

  const clearCart = useCallback(async () => {
    if (authed) {
      await clearMutation.mutateAsync();
    } else {
      updateLocal([]);
      clearLocalCart();
    }
  }, [authed, updateLocal, clearMutation]);

  // ─── Merge localStorage cart to server (called on login) ───
  const mergeMutation = useMutation({
    mutationFn: async (localCartItems: CartItem[]) => {
      const token = getAuthToken();
      const res = await fetch("/api/marketing/cart/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: localCartItems.map((i) => ({
            item_type: i.item_type,
            item_id: i.item_id,
            quantity: i.quantity,
            client_price_cents: i.price_cents,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to merge cart");
      return res.json();
    },
    onSuccess: () => {
      clearLocalCart();
      queryClient.invalidateQueries({ queryKey: ["marketing", "cart"] });
    },
  });

  const mergeOnLogin = useCallback(async () => {
    const local = readLocalCart();
    if (local.length > 0) {
      const result = await mergeMutation.mutateAsync(local);
      return result;
    }
    return { merged: 0, reconciled: [] };
  }, [mergeMutation]);

  // ─── Checkout ───
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const token = getAuthToken();
      const res = await fetch("/api/marketing/cart/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Checkout failed");
      }
      return res.json();
    },
  });

  const checkout = useCallback(async () => {
    const result = await checkoutMutation.mutateAsync();
    if (result.data?.url) {
      window.location.href = result.data.url;
    }
    return result;
  }, [checkoutMutation]);

  return {
    items,
    totalCents,
    itemCount,
    isLoading,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    mergeOnLogin,
    checkout,
    isAdding: addMutation.isPending,
    isCheckingOut: checkoutMutation.isPending,
  };
}
