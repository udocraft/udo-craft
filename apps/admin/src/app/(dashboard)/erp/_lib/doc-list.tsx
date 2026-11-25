"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, type LucideIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { AdminTablePanel } from "@/components/admin-layout";
import { cn } from "@/lib/utils";

export interface DocColumn<T> {
  header: string;
  cell: (item: T) => React.ReactNode;
  className?: string;
  align?: "right";
  /** Hidden from the mobile card (e.g. a long comment). */
  hideOnMobile?: boolean;
}

interface DocListProps<T extends { id: string }> {
  items: T[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  columns: DocColumn<T>[];
  href: (item: T) => string;
  /** Text for the link that opens a row, read by screen readers. */
  rowLabel: (item: T) => string;
  empty: { icon: LucideIcon; title: string; description: string; actionHref?: string; actionLabel?: string };
  minWidth?: string;
}

/**
 * Document list for the ERP screens: layout-matched skeleton, error with retry,
 * actionable empty state, table from md up and stacked cards below md.
 * Each row is opened by a real link, so it works from the keyboard.
 */
export function DocList<T extends { id: string }>({
  items, loading, error, onRetry, columns, href, rowLabel, empty, minWidth,
}: DocListProps<T>) {
  const router = useRouter();

  if (loading) {
    return (
      <AdminTablePanel>
        <div className="divide-y" aria-busy="true" aria-label="Завантаження">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              {columns.map((c, j) => (
                <Skeleton key={j} className={cn("h-3.5", j === 0 ? "w-20" : "flex-1", c.hideOnMobile && "hidden md:block")} />
              ))}
            </div>
          ))}
        </div>
      </AdminTablePanel>
    );
  }

  if (error) {
    return (
      <AdminTablePanel>
        <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Не вдалося завантажити список</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry}>Спробувати знову</Button>
        </div>
      </AdminTablePanel>
    );
  }

  if (items.length === 0) {
    return (
      <AdminTablePanel>
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={empty.actionHref ? (
            <Link href={empty.actionHref} className={buttonVariants({ size: "sm" })}>{empty.actionLabel ?? "Створити"}</Link>
          ) : undefined}
        />
      </AdminTablePanel>
    );
  }

  return (
    <>
      {/* md and up: table */}
      <AdminTablePanel className="hidden md:block">
        <div className="overflow-x-auto">
          <Table className={minWidth}>
            <TableHeader>
              <TableRow className="border-b bg-muted/30">
                {columns.map((c) => (
                  <TableHead key={c.header} className={cn("h-11", c.align === "right" && "text-right")}>{c.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a,button")) return;
                    router.push(href(item));
                  }}
                >
                  {columns.map((c, i) => (
                    <TableCell key={c.header} className={cn(c.className, c.align === "right" && "text-right")}>
                      {i === 0 ? (
                        <Link href={href(item)} className="rounded-sm hover:underline focus-visible:outline-2" aria-label={rowLabel(item)}>
                          {c.cell(item)}
                        </Link>
                      ) : c.cell(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AdminTablePanel>

      {/* below md: cards */}
      <ul className="divide-y rounded-lg border border-border bg-card md:hidden">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={href(item)}
              aria-label={rowLabel(item)}
              className="block px-4 py-3 active:bg-muted/60"
            >
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {columns.filter((c) => !c.hideOnMobile).map((c) => (
                  <div key={c.header} className="contents">
                    <dt className="text-xs text-muted-foreground">{c.header}</dt>
                    <dd className={cn("min-w-0 break-words", c.align === "right" && "text-right")}>{c.cell(item)}</dd>
                  </div>
                ))}
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
