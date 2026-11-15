"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ClipboardCheck,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DashboardData {
  metrics: {
    totalStock: number;
    totalValuation: number;
    totalItemsCount: number;
    lowStockCount: number;
    todayRevenue: number;
    todayOrdersCount: number;
    allSalesCount: number;
    lastStockCheck: {
      id: number;
      checkedAt: string;
      checkedBy: string;
      discrepancyCount: number;
      totalItemsAudited: number;
    } | null;
  };
  lowStockItems: {
    id: number;
    price: number;
    stock: number;
    type: { typeName: string };
    grade: { gradeName: string };
  }[];
  recentSales: {
    id: number;
    soldAt: string;
    total: number;
    salesDetails: {
      id: number;
      qty: number;
      priceAtSale: number;
      item: {
        type: { typeName: string };
        grade: { gradeName: string };
      };
    }[];
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Dashboard Inventaris & Kasir
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pemantauan stok real-time, register penjualan pakaian thrift, dan audit fisik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </button>
          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
          >
            <ShoppingCart className="h-4 w-4" />
            Buka Kasir POS
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Stock */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Total Fisik Pakaian
            </span>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {loading ? "..." : (data?.metrics.totalStock ?? 0)}
            </span>
            <span className="text-sm font-medium text-slate-500">pcs</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Dari {data?.metrics.totalItemsCount ?? 0} kombinasi jenis & grade
          </div>
        </div>

        {/* Card 2: Inventory Valuation */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Valuasi Nilai Stok
            </span>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {loading ? "..." : formatCurrency(data?.metrics.totalValuation ?? 0)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Estimasi omzet nilai jual barang tersedia
          </div>
        </div>

        {/* Card 3: Today's Sales */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Penjualan Hari Ini
            </span>
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {loading ? "..." : formatCurrency(data?.metrics.todayRevenue ?? 0)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {data?.metrics.todayOrdersCount ?? 0} transaksi berhasil hari ini
          </div>
        </div>

        {/* Card 4: Stock Opname & Low stock */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Audit & Stok Kritis
            </span>
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {loading ? "..." : (data?.metrics.lowStockCount ?? 0)}
            </span>
            <span className="text-sm font-medium text-slate-500">kategori menipis</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {data?.metrics.lastStockCheck ? (
              <span>
                Audit terakhir: {formatDate(data.metrics.lastStockCheck.checkedAt)}
              </span>
            ) : (
              "Belum ada riwayat audit fisik"
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold">Aksi Cepat Manajemen Pakaian</h2>
            <p className="mt-1 text-sm text-indigo-100">
              Pilih tindakan langsung untuk mempercepat alur kerja kasir dan gudang thrift shop.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/pos"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50"
            >
              <ShoppingCart className="h-4 w-4" />
              Transaksi Kasir
            </Link>
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-700/80 px-4 py-2.5 text-xs font-bold text-white backdrop-blur hover:bg-indigo-700"
            >
              <PlusCircle className="h-4 w-4" />
              Input Stok Baru
            </Link>
            <Link
              href="/stock-check"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-700/80 px-4 py-2.5 text-xs font-bold text-white backdrop-blur hover:bg-indigo-700"
            >
              <ClipboardCheck className="h-4 w-4" />
              Stock Opname Fisik
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Section: Low Stock Warning & Recent Sales */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Alert Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">
                Peringatan Stok Menipis (&le; 5 pcs)
              </h3>
            </div>
            <Link
              href="/inventory"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 pr-4 font-semibold">Jenis Pakaian</th>
                  <th className="py-2.5 px-3 font-semibold">Grade</th>
                  <th className="py-2.5 px-3 font-semibold">Harga Jual</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Sisa Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.lowStockItems && data.lowStockItems.length > 0 ? (
                  data.lowStockItems.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 pr-4 font-medium capitalize text-slate-800 dark:text-slate-200">
                        {item.type.typeName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Grade {item.grade.gradeName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            item.stock === 0
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                          }`}
                        >
                          {item.stock === 0 ? "Habis (0)" : `${item.stock} pcs`}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Semua stok dalam batas aman (&gt; 5 pcs)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sales Activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">
                Transaksi Kasir Terkini
              </h3>
            </div>
            <Link
              href="/pos"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Kasir Baru &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recentSales && data.recentSales.length > 0 ? (
              data.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Order #{sale.id}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(sale.soldAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {sale.salesDetails
                        .map(
                          (d) =>
                            `${d.qty}x ${d.item.type.typeName} (${d.item.grade.gradeName})`
                        )
                        .join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(sale.total)}
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Lunas
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada transaksi penjualan yang tercatat.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
