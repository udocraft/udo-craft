"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { type AdminUser, errMsg, usersApi } from "./user-utils";

export function useUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setUsers((await usersApi("/api/users")).users);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { users, loading, reload };
}
