"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCcw,
  Sparkles,
  ArrowRight,
  User,
  FileText,
  Search,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Item {
  id: number;
  typeId: number;
  gradeId: number;
  price: number;
  stock: number;
  type: { id: number; typeName: string };
  grade: { id: number; gradeName: string };
}

interface PastStockCheck {
  id: number;
  checkedAt: string;
  checkedBy: string | null;
  note: string | null;
  stockCheckDetails: {
    id: number;
    itemId: number;
    systemQty: number;
    actualQty: number;
    difference: number;
    item: {
      type: { typeName: string };
      grade: { gradeName: string };
    };
  }[];
}

export default function StockCheckPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [pastChecks, setPastChecks] = useState<PastStockCheck[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [checkedBy, setCheckedBy] = useState("Aditya (Store Manager)");
  const [auditNote, setAuditNote] = useState("");
  const [actualCounts, setActualCounts] = useState<Record<number, number>>({});
  const [reconcileStock, setReconcileStock] = useState(true); // "Option to start a match"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Search filter
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, checksRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/stock-check"),
      ]);

      const itemsJson = await itemsRes.json();
      const checksJson = await checksRes.json();

      if (itemsRes.ok && itemsJson.items) {
        setItems(itemsJson.items);
        // initialize actual count with system stock by default for convenience
        const initial: Record<number, number> = {};
        itemsJson.items.forEach((item: Item) => {
          initial[item.id] = item.stock;
        });
        setActualCounts(initial);
      }

      if (checksRes.ok && checksJson.checks) {
        setPastChecks(checksJson.checks);
      }
    } catch (err) {
      console.error("Failed to load audit data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleActualCountChange = (itemId: number, valueStr: string) => {
    const val = valueStr === "" ? 0 : Math.max(0, parseInt(valueStr, 10) || 0);
    setActualCounts((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.type.typeName.toLowerCase().includes(search.toLowerCase()) ||
        item.grade.gradeName.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  // Discrepancy Statistics
  const auditSummary = useMemo(() => {
    let matches = 0;
    let shortages = 0;
    let surpluses = 0;
    let totalDifference = 0;

    items.forEach((item) => {
      const actual = actualCounts[item.id] ?? item.stock;
      const diff = actual - item.stock;
      totalDifference += diff;
      if (diff === 0) matches++;
      else if (diff < 0) shortages += Math.abs(diff);
      else surpluses += diff;
    });

    return { matches, shortages, surpluses, totalDifference };
  }, [items, actualCounts]);

  const handleSubmitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const details = items.map((item) => ({
      itemId: item.id,
      actualQty: actualCounts[item.id] ?? item.stock,
    }));

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/stock-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkedBy,
          note: auditNote,
          reconcileStock, // Option to start a match / sync
          details,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan hasil stock opname.");
      }

      setStatusMsg({
        type: "success",
        text: `Stock Opname #${json.stockCheck.id} berhasil disimpan! ${
          reconcileStock
            ? "Stok sistem telah disinkronkan (matched) sesuai hasil fisik."
            : "Hanya dicatat sebagai log audit (stok sistem tidak berubah)."
        }`,
      });

      // Refresh items and past checks
      fetchData();
      setAuditNote("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Stock Opname (Audit Fisik Pakaian)
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Bandingkan stok sistem dengan hasil hitung fisik di gantungan/tumpukan toko.
        </p>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div
          className={`flex items-start gap-3 rounded-xl p-4 text-sm font-medium ${
            statusMsg.type === "error"
              ? "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200"
          }`}
        >
          {statusMsg.type === "error" ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div className="flex-1">{statusMsg.text}</div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Audit Workspace Form */}
      <form onSubmit={handleSubmitAudit} className="space-y-6">
        {/* Auditor Metadata & Reconciliation Banner */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Nama Auditor / Pemeriksa (checked_by):
              </label>
              <input
                type="text"
                required
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                placeholder="Contoh: Aditya, Staff Gudang..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                Catatan Sesi Audit (note):
              </label>
              <input
                type="text"
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                placeholder="Contoh: Audit mingguan sesudah buka bal baru..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* CRITICAL FEATURE: "Option to start a match / reconcile" */}
          <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={reconcileStock}
                onChange={(e) => setReconcileStock(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Sinkronkan & Samakan Stok Sistem (Start a Match / Reconcile)
                </span>
                <p className="mt-0.5 text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                  {reconcileStock
                    ? "\u2705 AKTIF: Saat disimpan, kolom stok di katalog (items.stock) akan otomatis diubah mengikuti hasil hitung fisik (actual_qty)."
                    : "\u274c NON-AKTIF: Hanya menyimpan data audit sebagai arsip riwayat selisih tanpa mengubah stok katalog sistem."}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Live Variance Summary Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              Total Item Diperiksa
            </span>
            <div className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
              {items.length} kombinasi
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-center dark:border-emerald-950 dark:bg-emerald-950/40">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase dark:text-emerald-400">
              Sesuai (Match 0)
            </span>
            <div className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {auditSummary.matches} item
            </div>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 text-center dark:border-rose-950 dark:bg-rose-950/40">
            <span className="text-[10px] font-semibold text-rose-700 uppercase dark:text-rose-400">
              Selisih Kurang (Hilang)
            </span>
            <div className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-400">
              -{auditSummary.shortages} pcs
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-center dark:border-blue-950 dark:bg-blue-950/40">
            <span className="text-[10px] font-semibold text-blue-700 uppercase dark:text-blue-400">
              Selisih Lebih (Surplus)
            </span>
            <div className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-400">
              +{auditSummary.surpluses} pcs
            </div>
          </div>
        </div>

        {/* Interactive Counting Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
            <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
              Input Hitungan Fisik per Item
            </h3>
            <div className="relative w-64">
              <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Saring jenis / grade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-1.5 pr-2 pl-8 text-xs dark:border-slate-800 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-bold">Jenis Pakaian</th>
                  <th className="py-3 px-4 font-bold">Grade</th>
                  <th className="py-3 px-4 font-bold">Stok Sistem (system_qty)</th>
                  <th className="py-3 px-4 font-bold">Hitungan Fisik (actual_qty)</th>
                  <th className="py-3 px-4 text-right font-bold">Selisih (difference)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Memuat daftar item audit...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Tidak ada pakaian ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const actual = actualCounts[item.id] ?? item.stock;
                    const diff = actual - item.stock;

                    return (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3 px-4 font-bold capitalize text-slate-900 dark:text-white">
                          {item.type.typeName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Grade {item.grade.gradeName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                          {item.stock} pcs
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="0"
                            value={actualCounts[item.id] ?? item.stock}
                            onChange={(e) =>
                              handleActualCountChange(item.id, e.target.value)
                            }
                            className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                              diff === 0
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : diff < 0
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {diff === 0
                              ? "Pas (0)"
                              : diff < 0
                              ? `${diff} pcs (Kurang)`
                              : `+${diff} pcs (Lebih)`}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Form Submit Bar */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-xs text-slate-500">
              {reconcileStock
                ? "Perhatian: Menyimpan akan mencocokkan stok sistem secara instan."
                : "Hanya mencatat log selisih tanpa mengubah stok."}
            </span>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <ClipboardCheck className="h-4 w-4" />
              {isSubmitting
                ? "Menyimpan Audit..."
                : reconcileStock
                ? "Simpan & Sinkronkan Stok Fisik"
                : "Simpan Laporan Audit Saja"}
            </button>
          </div>
        </div>
      </form>

      {/* Past Stock Checks History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Riwayat Sesi Stock Opname Sebelumnya
          </h2>
        </div>

        {pastChecks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Belum ada sesi audit stok yang tercatat.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pastChecks.map((check) => {
              const discrepancyCount = check.stockCheckDetails.filter(
                (d) => d.difference !== 0
              ).length;

              return (
                <div
                  key={check.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          Audit #{check.id}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(check.checkedAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Oleh:{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {check.checkedBy || "Anonim"}
                        </span>
                      </div>
                      {check.note && (
                        <div className="mt-1 text-xs text-slate-600 italic dark:text-slate-400">
                          &ldquo;{check.note}&rdquo;
                        </div>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        discrepancyCount === 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {discrepancyCount === 0
                        ? "100% Cocok"
                        : `${discrepancyCount} Selisih`}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">
                      Detail Selisih:
                    </div>
                    <div className="mt-2 space-y-1">
                      {check.stockCheckDetails
                        .filter((d) => d.difference !== 0)
                        .slice(0, 4)
                        .map((d) => (
                          <div
                            key={d.id}
                            className="flex justify-between text-slate-600 dark:text-slate-300"
                          >
                            <span className="capitalize">
                              {d.item.type.typeName} (Gr. {d.item.grade.gradeName})
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                d.difference < 0 ? "text-rose-600" : "text-blue-600"
                              }`}
                            >
                              Sistem: {d.systemQty} &rarr; Fisik: {d.actualQty} (
                              {d.difference > 0 ? `+${d.difference}` : d.difference})
                            </span>
                          </div>
                        ))}
                      {check.stockCheckDetails.filter((d) => d.difference !== 0)
                        .length > 4 && (
                        <div className="text-[11px] text-slate-400 italic">
                          +{" "}
                          {check.stockCheckDetails.filter((d) => d.difference !== 0)
                            .length - 4}{" "}
                          item selisih lainnya
                        </div>
                      )}
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
