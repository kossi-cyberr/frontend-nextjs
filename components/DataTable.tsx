"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Spinner, EmptyState } from "./ui";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  totalElements: number;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  searchValue?: string;
  onSearch?: (search: string) => void;
  searchPlaceholder?: string;
  sortBy?: string;
  sortDir?: string;
  onSort?: (sortBy: string, sortDir: string) => void;
  emptyMessage?: string;
  rowKey: (row: T) => string | number;
  toolbar?: ReactNode;
}

export default function DataTable<T>({
  columns,
  rows,
  loading,
  totalElements,
  page,
  size,
  onPageChange,
  onSizeChange,
  searchValue,
  onSearch,
  searchPlaceholder = "Rechercher…",
  sortBy,
  sortDir,
  onSort,
  emptyMessage = "Aucun élément trouvé",
  rowKey,
  toolbar,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalElements / size));

  const toggleSort = (key: string) => {
    if (!onSort) return;
    const dir = sortBy === key && sortDir === "asc" ? "desc" : "asc";
    onSort(key, dir);
  };

  return (
    <div className="glass overflow-hidden">
      {(onSearch || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
          {toolbar}
          {onSearch && (
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className="field w-64 pl-9"
                placeholder={searchPlaceholder}
                value={searchValue ?? ""}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                  }`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 transition hover:text-slate-300"
                    >
                      {col.header}
                      {sortBy === col.key &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3 text-indigo-400" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-indigo-400" />
                        ))}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <Spinner />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState message={emptyMessage} />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-white/[0.03] transition hover:bg-white/[0.03]"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-6 py-4 text-slate-300 ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : ""
                      } ${col.className ?? ""}`}
                    >
                      {col.render ? col.render(row) : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
        <p className="text-xs text-slate-500">
          {num(totalElements)} élément{totalElements > 1 ? "s" : ""}
          {totalElements > 0 && <> · page {page + 1}/{totalPages}</>}
        </p>
        <div className="flex items-center gap-3">
          {onSizeChange && (
            <select
              className="field !w-auto !py-1.5 text-xs"
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
            >
              {[5, 10, 25, 50].map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition enabled:hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition enabled:hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function num(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}
