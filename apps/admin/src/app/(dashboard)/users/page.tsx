"use client";

import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminEmptyState, AdminSearch, AdminTablePanel, AdminToolbar } from "@/components/admin-layout";
import { ListPage } from "@/components/page-templates";
import { cn } from "@/lib/utils";
import { UserRow } from "./_components/UserRow";
import { useUsers } from "./_components/useUsers";
import { type Role, TABS, normalizeRole } from "./_components/user-utils";

function UsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = normalizeRole((searchParams.get("role") || "all") as Role) as Role | "all";
  const { users, loading, reload } = useUsers();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== "all" && normalizeRole((u.access_role || "") as Role) !== filter) return false;
      return !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    });
  }, [users, filter, deferredSearch]);

  return (
    <ListPage
      title="Користувачі"
      createHref="/users/new"
      createLabel="Запросити"
      tabs={TABS}
      tab={filter as (typeof TABS)[number]["key"]}
      onTabChange={(next) => router.push(`/users?role=${next}`)}
      actions={
        <Button variant="outline" size="icon" aria-label="Оновити" onClick={reload} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </Button>
      }
      filters={
        <AdminToolbar>
          <AdminSearch value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Пошук за ім'ям або email" />
          <span className="ml-auto text-xs font-medium text-muted-foreground" aria-live="polite">{filtered.length} користувачів</span>
        </AdminToolbar>
      }
    >
      <AdminTablePanel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Користувач</TableHead>
              <TableHead>Сегмент</TableHead>
              <TableHead className="hidden lg:table-cell">Замовлення</TableHead>
              <TableHead className="hidden md:table-cell">Зареєстрований</TableHead>
              <TableHead className="hidden md:table-cell">Активність</TableHead>
              <TableHead className="hidden sm:table-cell">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent"><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent"><TableCell colSpan={6}><AdminEmptyState icon={Users} title="Немає користувачів" /></TableCell></TableRow>
            ) : (
              filtered.map((u) => <UserRow key={u.id} user={u} onOpen={(user) => router.push(`/users/${user.id}`)} />)
            )}
          </TableBody>
        </Table>
      </AdminTablePanel>
    </ListPage>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersContent />
    </Suspense>
  );
}
