"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Boxes,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Plus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Item {
  id: number;
  typeId: number;
  gradeId: number;
  price: number;
  stock: number;
  type: { id: number; typeName: string };
  grade: { id: number; gradeName: string };
}

interface TypeEntity {
  id: number;
  typeName: string;
}

interface GradeEntity {
  id: number;
  gradeName: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [types, setTypes] = useState<TypeEntity[]>([]);
  const [grades, setGrades] = useState<GradeEntity[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");

  // Dedicated Stock Intake Modal State
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [selectedItemForIntake, setSelectedItemForIntake] = useState<Item | null>(null);
  const [intakeMode, setIntakeMode] = useState<"add" | "set">("add");
  const [intakeQty, setIntakeQty] = useState<string>("10");
  const [intakePrice, setIntakePrice] = useState<string>("");
  const [intakeNote, setIntakeNote] = useState<string>("");
  const [intakeLoading, setIntakeLoading] = useState(false);

  // New Combination Modal State
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newTypeId, setNewTypeId] = useState<string>("");
  const [newGradeId, setNewGradeId] = useState<string>("");
  const [newPrice, setNewPrice] = useState<string>("50000");
  const [newInitialStock, setNewInitialStock] = useState<string>("10");
  const [newItemLoading, setNewItemLoading] = useState(false);

  // Toast / Status Message
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/items");
      const json = await res.json();
      if (res.ok) {
        setItems(json.items || []);
        setTypes(json.types || []);
        setGrades(json.grades || []);
      }
    } catch (err) {
      console.error("Failed to load catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchType =
        selectedType === "all" || item.type.typeName === selectedType;
      const matchGrade =
        selectedGrade === "all" || item.grade.gradeName === selectedGrade;
      const matchSearch =
        item.type.typeName.toLowerCase().includes(search.toLowerCase()) ||
        item.grade.gradeName.toLowerCase().includes(search.toLowerCase());
      return matchType && matchGrade && matchSearch;
    });
  }, [items, selectedType, selectedGrade, search]);

  const openIntakeForm = (item: Item) => {
    setSelectedItemForIntake(item);
    setIntakeMode("add");
    setIntakeQty("10");
    setIntakePrice(item.price.toString());
    setIntakeNote("");
    setIsIntakeOpen(true);
  };

  const handleStockIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForIntake) return;

    const qtyNum = parseInt(intakeQty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      setStatusMsg({
        type: "error",
        text: "Jumlah stok harus berupa angka positif.",
      });
      return;
    }

    try {
      setIntakeLoading(true);
      const res = await fetch("/api/stock-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItemForIntake.id,
          mode: intakeMode,
          qty: qtyNum,
          price: intakePrice ? parseFloat(intakePrice) : undefined,
          note: intakeNote,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memperbarui stok.");
      }

      setStatusMsg({
        type: "success",
        text: `Stok ${selectedItemForIntake.type.typeName} (Grade ${selectedItemForIntake.grade.gradeName}) berhasil diperbarui: ${json.previousStock} \u2192 ${json.newStock} pcs!`,
      });
      setIsIntakeOpen(false);
      fetchCatalog();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setIntakeLoading(false);
    }
  };

  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeId || !newGradeId || !newPrice) {
      setStatusMsg({
        type: "error",
        text: "Pilih jenis, grade, dan isi harga jual.",
      });
      return;
    }

    try {
      setNewItemLoading(true);
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeId: parseInt(newTypeId, 10),
          gradeId: parseInt(newGradeId, 10),
          price: parseFloat(newPrice),
          stock: parseInt(newInitialStock || "0", 10),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan item kombinasi.");
      }

      setStatusMsg({
        type: "success",
        text: `Item kombinasi berhasil ditambahkan ke katalog!`,
      });
      setIsNewItemOpen(false);
      fetchCatalog();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setNewItemLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Katalog & Manajemen Stok
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Daftar kombinasi Jenis + Grade pakaian, harga jual, dan form input stok masuk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (items.length > 0) openIntakeForm(items[0]);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
          >
            <PlusCircle className="h-4 w-4" />
            Form Input Stok
          </button>
          <button
            onClick={() => {
              setNewTypeId(types[0]?.id.toString() || "");
              setNewGradeId(grades[0]?.id.toString() || "");
              setIsNewItemOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Plus className="h-4 w-4 text-indigo-600" />
            Tambah Kombinasi Baru
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg && (
        <div
          className={`flex items-start gap-3 rounded-xl p-4 text-sm font-medium ${
            statusMsg.type === "error"
              ? "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200"
          }`}
        >
          {statusMsg.type === "error" ? (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
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

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari jenis pakaian atau grade..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 capitalize focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">Semua Jenis</option>
            {types.map((t) => (
              <option key={t.id} value={t.typeName}>
                {t.typeName}
              </option>
            ))}
          </select>

          {/* Filter Grade */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">Semua Grade</option>
            {grades.map((g) => (
              <option key={g.id} value={g.gradeName}>
                Grade {g.gradeName}
              </option>
            ))}
          </select>

          <button
            onClick={fetchCatalog}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="py-3.5 px-4 font-bold">Item ID</th>
                <th className="py-3.5 px-4 font-bold">Jenis Pakaian (type_name)</th>
                <th className="py-3.5 px-4 font-bold">Grade (grade_name)</th>
                <th className="py-3.5 px-4 font-bold">Harga Jual (price)</th>
                <th className="py-3.5 px-4 font-bold">Stok Sistem (stock)</th>
                <th className="py-3.5 px-4 font-bold">Status Stok</th>
                <th className="py-3.5 px-4 text-right font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Memuat data stok...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada item yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isOutOfStock = item.stock <= 0;
                  const isLowStock = item.stock > 0 && item.stock <= 5;

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                        #{item.id}
                      </td>
                      <td className="py-3.5 px-4 font-bold capitalize text-slate-900 dark:text-white">
                        {item.type.typeName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-extrabold ${
                            item.grade.gradeName === "A"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : item.grade.gradeName === "B"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                          }`}
                        >
                          Grade {item.grade.gradeName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {item.stock}
                        </span>{" "}
                        <span className="text-slate-400">pcs</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                            Habis
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                            Menipis ({item.stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                            Tersedia
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openIntakeForm(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-slate-700"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Input Stok
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEDICATED STOCK INTAKE MODAL */}
      {isIntakeOpen && selectedItemForIntake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Form Input Stok Masuk
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dedicated stock intake form untuk pakaian thrift
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsIntakeOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleStockIntakeSubmit} className="mt-4 space-y-4">
              {/* Item Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Target Pakaian:
                </label>
                <select
                  value={selectedItemForIntake.id}
                  onChange={(e) => {
                    const found = items.find(
                      (i) => i.id === parseInt(e.target.value, 10)
                    );
                    if (found) {
                      setSelectedItemForIntake(found);
                      setIntakePrice(found.price.toString());
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 capitalize dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.type.typeName} &bull; Grade {i.grade.gradeName} (Stok Saat Ini: {i.stock} pcs)
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode: Add vs Set */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Metode Input Stok:
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIntakeMode("add")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      intakeMode === "add"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <div className="text-xs font-bold">+ Tambah Stok Baru</div>
                    <div className="mt-0.5 text-[11px] opacity-75">
                      Menambahkan jumlah pcs ke stok yang sudah ada ({selectedItemForIntake.stock} + Qty).
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntakeMode("set")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      intakeMode === "set"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <div className="text-xs font-bold">= Tetapkan Jumlah Stok</div>
                    <div className="mt-0.5 text-[11px] opacity-75">
                      Menimpa stok sistem secara langsung dengan nilai baru.
                    </div>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {intakeMode === "add" ? "Jumlah Ditambahkan (pcs):" : "Stok Baru Ditetapkan (pcs):"}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={intakeQty}
                  onChange={(e) => setIntakeQty(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  Estimasi hasil stok:{" "}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {intakeMode === "add"
                      ? selectedItemForIntake.stock + (parseInt(intakeQty, 10) || 0)
                      : parseInt(intakeQty, 10) || 0}{" "}
                    pcs
                  </span>
                </div>
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Penyesuaian Harga Jual Satuan (Rp):
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={intakePrice}
                  onChange={(e) => setIntakePrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Audit Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Catatan / Keterangan Sumber Stok:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Buka bal celana USA, sortir ulang grade A"
                  value={intakeNote}
                  onChange={(e) => setIntakeNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsIntakeOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={intakeLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {intakeLoading ? "Menyimpan..." : "Simpan Stok Masuk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW COMBINATION MODAL */}
      {isNewItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tambah Kombinasi Pakaian Baru
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Buat kombinasi baru antara jenis pakaian dan grade.
            </p>

            <form onSubmit={handleCreateNewItem} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Jenis Pakaian (Type):
                </label>
                <select
                  value={newTypeId}
                  onChange={(e) => setNewTypeId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold capitalize dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.typeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Grade:
                </label>
                <select
                  value={newGradeId}
                  onChange={(e) => setNewGradeId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      Grade {g.gradeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Harga Jual Satuan (Rp):
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Stok Awal (pcs):
                </label>
                <input
                  type="number"
                  min="0"
                  value={newInitialStock}
                  onChange={(e) => setNewInitialStock(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewItemOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={newItemLoading}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {newItemLoading ? "Menyimpan..." : "Simpan Kombinasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
