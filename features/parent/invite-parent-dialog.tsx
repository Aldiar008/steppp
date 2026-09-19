"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { describeAuthError } from "@/lib/auth/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { formatDateRu } from "@/lib/date";

/**
 * Generates a one-time parent invite code and hands over the link to share it.
 *
 * Replaces the old `ShareWithParent`: there the whole snapshot rode inside the
 * URL and anyone holding it could open it, no account required. Here the link
 * carries nothing but a code — `get_invite_info`/`redeem_parent_invite` decide
 * what it's worth, and only after the parent has their own account does any
 * of the student's data become reachable, and only to them.
 */
export function InviteParentDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; code: string; expiresAt: string }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [copied, setCopied] = useState(false);

  async function createInvite() {
    setState({ status: "loading" });
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_parent_invite");
    const row = data?.[0];
    if (error || row === undefined) {
      setState({ status: "error", message: describeAuthError(error) });
      return;
    }
    setState({ status: "ready", code: row.code, expiresAt: row.expires_at });
  }

  const link = state.status === "ready" ? `${window.location.origin}/parent/join/${state.code}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Ссылка скопирована");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не получилось скопировать. Выдели и скопируй ссылку вручную");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && state.status === "idle") void createInvite();
        if (!next) setState({ status: "idle" });
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-9">
          Пригласить родителя
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ссылка для родителя</DialogTitle>
          <DialogDescription>
            Родитель откроет её, заведёт свой собственный вход по email и паролю и увидит
            план — только для чтения. Ссылка не содержит твоих данных, только одноразовый код.
          </DialogDescription>
        </DialogHeader>

        {state.status === "loading" || state.status === "idle" ? (
          <p className="text-sm text-muted-foreground">Готовим ссылку…</p>
        ) : state.status === "error" ? (
          <p role="alert" className="text-sm text-critical-ink">
            {state.message}
          </p>
        ) : (
          <>
            <Input
              readOnly
              value={link}
              onFocus={(event) => event.currentTarget.select()}
              className="font-mono text-xs"
              aria-label="Ссылка для родителя"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Действует до {formatDateRu(state.expiresAt.slice(0, 10))} и одноразовая — как только
              родитель заведёт по ней аккаунт, ссылка перестанет работать. Понадобится ещё один
              родитель или новое устройство — сделай новую здесь же.
            </p>
          </>
        )}

        <DialogFooter>
          <Button onClick={copy} disabled={link === ""}>
            {copied ? "Скопировано" : "Скопировать ссылку"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
