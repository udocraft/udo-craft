"use client";

import { memo } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@udo-craft/ui";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { type AdminUser, STAGE_BADGE, fmtDate, fmtMoney, initials, stageLabel } from "./user-utils";

export const UserRow = memo(function UserRow({ user: u, onOpen }: { user: AdminUser; onOpen: (user: AdminUser) => void }) {
  return (
    <TableRow className="cursor-pointer" onClick={() => onOpen(u)}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-8 shrink-0 rounded-lg">
            <AvatarImage src={u.avatar_url} alt="" />
            <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
              {initials(u.full_name, u.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link href={`/users/${u.id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-sm font-medium leading-tight hover:text-primary">
              {u.full_name || "—"}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={STAGE_BADGE[u.lifecycle_stage]}>{stageLabel(u)}</Badge>
      </TableCell>
      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
        {u.order_count ? `${u.order_count} · ${fmtMoney(u.lifetime_value_cents)}` : "—"}
      </TableCell>
      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{fmtDate(u.created_at)}</TableCell>
      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
        {fmtDate(u.last_customer_activity_at || u.last_sign_in_at)}
      </TableCell>
      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
        {u.confirmed ? "Активний" : "Запрошений"}
      </TableCell>
    </TableRow>
  );
});
