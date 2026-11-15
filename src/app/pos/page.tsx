"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Printer,
  RotateCcw,
  Search,
  Tag,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Item {
  id: number;
  typeId: number;
  gradeId: number;
  price: number;
  stock: number;
  type: { id: number; typeName: string };
  grade: { id: number; gradeName: string };
}

interface CartItem {
  item: Item;
  qty: number;
}

interface CompletedSale {
  id: number;
  soldAt: string;
  total: number;
  salesDetails: {
    id: number;
    qty: number;
    priceAtSale: number;
    subtotal: number;
    item: {
      type: { typeName: string };
      grade: { gradeName: string };
    };
  }[];
}

export default function PosPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [receiptSale, setReceiptSale] = useState<CompletedSale | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/items");
      const json = await res.json();
      if (res.ok && json.items) {
        setItems(json.items);
      }
    } catch (err) {
      console.error("Failed to load items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.type.typeName));
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType =
        selectedType === "all" || item.type.typeName === selectedType;
      const matchesSearch =
        item.type.typeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.grade.gradeName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [items, selectedType, searchQuery]);

  const addToCart = (item: Item) => {
    setAlertMessage(null);

    // Strict validation: cannot add out of stock
    if (item.stock <= 0) {
      setAlertMessage({
        type: "error",
        text: `Stok untuk "${item.type.typeName} (Grade ${item.grade.gradeName})" habis (0 pcs). Tidak dapat ditambahkan ke kasir!`,
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        if (existing.qty + 1 > item.stock) {
          setAlertMessage({
            type: "error",
            text: `Stok "${item.type.typeName} (Grade ${item.grade.gradeName})" tidak mencukupi! Maksimal hanya tersedia ${item.stock} pcs.`,
          });
          return prev;
        }
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, qty: ci.qty + 1 } : ci
        );
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateCartQty = (itemId: number, newQty: number) => {
    setAlertMessage(null);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }

    // STRICT VALIDATION: Block if requested quantity exceeds stock
    if (newQty > item.stock) {
      setAlertMessage({
        type: "error",
        text: `Stok tidak mencukupi! Maksimum tersedia untuk ${item.type.typeName} (Grade ${item.grade.gradeName}) adalah ${item.stock} pcs.`,
      });
      return;
    }

    setCart((prev) =>
      prev.map((ci) => (ci.item.id === itemId ? { ...ci, qty: newQty } : ci))
    );
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setAlertMessage(null);
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, ci) => sum + ci.item.price * ci.qty, 0);
  }, [cart]);

  const totalCartUnits = useMemo(() => {
    return cart.reduce((sum, ci) => sum + ci.qty, 0);
  }, [cart]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setAlertMessage(null);

    // Final client-side stock validation
    for (const ci of cart) {
      const liveItem = items.find((i) => i.id === ci.item.id);
      if (!liveItem || ci.qty > liveItem.stock) {
        setAlertMessage({
          type: "error",
          text: `Checkout ditolak: Jumlah "${ci.item.type.typeName} (${ci.item.grade.gradeName})" melebihi stok yang ada!`,
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((ci) => ({
            itemId: ci.item.id,
            qty: ci.qty,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memproses transaksi kasir.");
      }

      // Success
      setReceiptSale(json.sale);
      setCart([]);
      fetchItems(); // refresh current stock
      setAlertMessage({
        type: "success",
        text: `Transaksi #${json.sale.id} berhasil dicatat dan stok telah dikurangi!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setAlertMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Mesin Kasir (POS)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pilih pakaian berdasarkan jenis dan grade untuk transaksi penjualan langsung.
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`flex items-start gap-3 rounded-xl p-4 text-sm font-medium ${
            alertMessage.type === "error"
              ? "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200"
          }`}
        >
          {alertMessage.type === "error" ? (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div className="flex-1">{alertMessage.text}</div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Grid: Left Catalog, Right Cart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Item Selection (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Filters & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari jenis pakaian (misal: Jeans, Kaos, Jaket)..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Type selector pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedType("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedType === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                Semua
              </button>
              {uniqueTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    selectedType === type
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="py-20 text-center text-sm text-slate-400">
              Memuat katalog pakaian...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400 dark:border-slate-800">
              Tidak ada pakaian ditemukan.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredItems.map((item) => {
                const isOutOfStock = item.stock <= 0;
                const inCartItem = cart.find((ci) => ci.item.id === item.id);
                const remainingAvailable = item.stock - (inCartItem?.qty ?? 0);

                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    disabled={isOutOfStock || remainingAvailable <= 0}
                    className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                      isOutOfStock || remainingAvailable <= 0
                        ? "cursor-not-allowed border-slate-200 bg-slate-100/60 opacity-60 dark:border-slate-800 dark:bg-slate-900/40"
                        : "cursor-pointer border-slate-200 bg-white shadow-xs hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold capitalize text-slate-900 dark:text-white">
                          {item.type.typeName}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                            item.grade.gradeName === "A"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : item.grade.gradeName === "B"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                          }`}
                        >
                          Grade {item.grade.gradeName}
                        </span>
                      </div>
                      <div className="mt-2 text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(item.price)}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                      <span className="text-slate-400">Tersedia:</span>
                      <span
                        className={`font-bold ${
                          isOutOfStock
                            ? "text-rose-600 dark:text-rose-400"
                            : item.stock <= 5
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {isOutOfStock ? "HABIS (0)" : `${item.stock} pcs`}
                      </span>
                    </div>

                    {inCartItem && (
                      <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">
                        {inCartItem.qty}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="font-bold text-slate-900 dark:text-white">
                  Keranjang Kasir
                </h2>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {totalCartUnits} pcs
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Kosongkan
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="my-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Keranjang masih kosong. Klik pilihan pakaian di sebelah kiri untuk menambahkan.
                </div>
              ) : (
                cart.map((ci) => {
                  const itemSubtotal = ci.item.price * ci.qty;
                  const isMaxStockReached = ci.qty >= ci.item.stock;

                  return (
                    <div
                      key={ci.item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold capitalize text-slate-900 dark:text-white">
                            {ci.item.type.typeName}
                          </span>
                          <span className="rounded bg-slate-200 px-1 py-0.2 text-[10px] font-semibold dark:bg-slate-700">
                            Gr. {ci.item.grade.gradeName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatCurrency(ci.item.price)} &times; {ci.qty}
                        </div>
                        {isMaxStockReached && (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            (Maks. stok tercapai)
                          </span>
                        )}
                      </div>

                      {/* Quantity Controls with strict block */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateCartQty(ci.item.id, ci.qty - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-extrabold text-slate-900 dark:text-white">
                          {ci.qty}
                        </span>
                        <button
                          onClick={() => updateCartQty(ci.item.id, ci.qty + 1)}
                          disabled={isMaxStockReached}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <Plus className="h-3 w-3" />
                        </button>

                        <button
                          onClick={() => removeFromCart(ci.item.id)}
                          className="ml-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="w-24 text-right text-xs font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(itemSubtotal)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total & Checkout */}
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                  Total Pembayaran
                </span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:shadow-none dark:disabled:bg-slate-800"
              >
                {isSubmitting ? (
                  <span>Memproses Transaksi...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Selesaikan Transaksi ({formatCurrency(cartTotal)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {receiptSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                Transaksi Berhasil!
              </h3>
              <p className="text-xs text-slate-500">
                Nomor Struk: #{receiptSale.id} &bull; {formatDate(receiptSale.soldAt)}
              </p>
            </div>

            <div className="my-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <div className="text-center font-bold tracking-wider text-slate-900 uppercase dark:text-white">
                THRIFT INVENTORY SHOP
              </div>
              <div className="mt-2 border-b border-dashed border-slate-200 pb-2 text-[10px] text-slate-400 dark:border-slate-700">
                Snapshot Harga Saat Transaksi (price_at_sale)
              </div>

              <div className="my-3 space-y-2">
                {receiptSale.salesDetails.map((detail) => (
                  <div key={detail.id} className="flex justify-between">
                    <div>
                      <div className="capitalize">
                        {detail.item.type.typeName} (Gr. {detail.item.grade.gradeName})
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {detail.qty} x {formatCurrency(detail.priceAtSale)}
                      </div>
                    </div>
                    <div className="font-bold">{formatCurrency(detail.subtotal)}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-200 pt-2 dark:border-slate-700">
                <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(receiptSale.total)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Printer className="h-4 w-4" />
                Cetak Struk
              </button>
              <button
                onClick={() => setReceiptSale(null)}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Tutup & Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
