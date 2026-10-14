import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 25, 50, 100];

// Reusable sortable, paginated table built on shadcn Table and TanStack Table.
// `numeric` lists column ids whose values should be right-aligned.
export function DataTable<T>({
  columns,
  data,
  pageSize = 25,
  numeric = [],
  onRowClick,
  isSelected,
  emptyText = "No rows match the current filters.",
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  pageSize?: number;
  numeric?: string[];
  onRowClick?: (row: T) => void;
  isSelected?: (row: T) => boolean;
  emptyText?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const { pageIndex, pageSize: size } = table.getState().pagination;
  const pageCount = Math.max(table.getPageCount(), 1);
  const total = data.length;
  const from = total === 0 ? 0 : pageIndex * size + 1;
  const to = Math.min(total, (pageIndex + 1) * size);

  return (
    <div className="space-y-3">
      <div className="relative max-h-[68vh] overflow-auto rounded-md border border-border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--color-border)]">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  const right = numeric.includes(header.column.id);
                  const label = flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <TableHead
                      key={header.id}
                      className={cn("whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground", right && "text-right")}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-semibold uppercase tracking-wide text-inherit hover:text-foreground",
                            right && "flex-row-reverse",
                          )}
                        >
                          {label}
                          {dir === "asc" ? <ArrowUp className="size-3.5" /> : null}
                          {dir === "desc" ? <ArrowDown className="size-3.5" /> : null}
                          {!dir ? <ChevronsUpDown className="size-3.5 opacity-40" /> : null}
                        </button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const selected = isSelected?.(row.original) ?? false;
                return (
                  <TableRow
                    key={row.id}
                    data-state={selected ? "selected" : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn("whitespace-nowrap py-2.5", numeric.includes(cell.column.id) && "text-right tabular-nums")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Showing {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")} of {total.toLocaleString("en-US")}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            Rows
            <select
              className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              value={size}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
            >
              {PAGE_SIZES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <span>
            Page {pageIndex + 1} of {pageCount}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
