"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, inputClass } from "@/components/form";
import { useAuthSession } from "@/features/auth/use-auth-session";
import { describeAuthError } from "@/lib/auth/auth-errors";
import { createClient } from "@/lib/supabase/client";

export interface InviteInfo {
  valid: boolean;
  reason: string;
  student_name: string | null;
}

const REASON_MESSAGE: Record<string, string> = {
  not_found: "Такой ссылки не существует — проверь, не обрезалась ли она при пересылке.",
  used: "Эта ссылка уже использована. Попроси у ребёнка новую в разделе «Аккаунт и семья».",
  expired: "Срок ссылки истёк — она действует 7 дней. Попроси у ребёнка новую.",
  self: "Ты открыл(а) собственную ссылку. Она предназначена для родителя, а не для тебя самого.",
  wrong_role: "Этот email уже зарегистрирован как аккаунт ученика в Stepwise. Родителю нужен отдельный email.",
  not_ready: "Аккаунт ещё создаётся — обнови страницу через несколько секунд.",
};

/**
 * The parent-invite landing screen: validate → let the parent create (or
 * reuse) *their own* account → redeem the code → land in their dashboard.
 *
 * Three shapes of visitor arrive here, and each gets a different screen:
 * an already-signed-in parent (redeem immediately — the multi-child case), a
 * signed-in student (blocked, with an explanation), or nobody (the
 * sign-in/sign-up form).
 */
export function JoinScreen({ code, info }: { code: string; info: InviteInfo }) {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const { status } = useAuthSession();

  if (!info.valid) {
    return <ErrorCard message={REASON_MESSAGE[info.reason] ?? "Эта ссылка недействительна."} />;
  }

  if (status === "loading") return null;

  if (status === "student") {
    return (
      <ErrorCard message="Ты вошёл(а) в Stepwise как ученик. Родителю нужен отдельный аккаунт — выйди из своего и открой ссылку заново, или используй другой браузер." />
    );
  }

  if (status === "parent") {
    return <RedeemDirectly code={code} studentName={info.student_name} />;
  }

  return (
    <JoinForm
      code={code}
      studentName={info.student_name}
      initialError={callbackError ? REASON_MESSAGE[callbackError] ?? "Не получилось привязать аккаунт." : undefined}
    />
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="panel mx-auto max-w-md space-y-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Ссылку не получилось открыть</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}

/** Already a parent (possibly with other children) — just consume the code. */
function RedeemDirectly({ code, studentName }: { code: string; studentName: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("redeem_parent_invite", { p_code: code });
        if (cancelled) return;
        const outcome = error ? "error" : (data?.[0]?.status ?? "error");
        if (outcome === "ok") {
          setState("done");
          router.push("/parent/dashboard");
          return;
        }
        setState("error");
        setMessage(REASON_MESSAGE[outcome] ?? "Не получилось привязать аккаунт. Попробуй ещё раз.");
      } catch (unexpected) {
        // An unhandled rejection here (e.g. the client constructor throwing on
        // a misconfigured project) would otherwise leave the screen reading
        // "Секунду." forever with nothing in the UI explaining why.
        if (!cancelled) {
          setState("error");
          setMessage(describeAuthError(unexpected));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  if (state === "error") return <ErrorCard message={message} />;

  return (
    <div className="panel mx-auto max-w-md space-y-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Привязываем {studentName ?? "ребёнка"}…</h1>
      <p className="text-sm text-muted-foreground">Секунду.</p>
    </div>
  );
}

function JoinForm({
  code,
  studentName,
  initialError,
}: {
  code: string;
  studentName: string | null;
  initialError?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const [checkInbox, setCheckInbox] = useState(false);

  async function afterSignedIn(): Promise<void> {
    const supabase = createClient();
    const { data, error: redeemError } = await supabase.rpc("redeem_parent_invite", { p_code: code });
    const status = redeemError ? "error" : (data?.[0]?.status ?? "error");
    if (status === "ok") {
      router.push("/parent/dashboard");
      return;
    }
    setError(REASON_MESSAGE[status] ?? "Вошли, но не получилось привязать аккаунт. Попробуй ещё раз.");
  }

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(undefined);
    setBusy(true);

    try {
      // Same reason as features/auth/auth-screen.tsx: the client constructor
      // can throw synchronously (a misconfigured project), and that has to
      // stay inside this try or the button sticks on "Секунду…" forever with
      // no visible error.
      const supabase = createClient();

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(describeAuthError(signInError));
          return;
        }
        await afterSignedIn();
        return;
      }

      if (name.trim().length === 0) {
        setError("Напиши имя.");
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "parent", name: name.trim() } },
      });
      if (signUpError) {
        setError(describeAuthError(signUpError));
        return;
      }
      if (data.session === null) {
        setCheckInbox(true);
        return;
      }
      await afterSignedIn();
    } catch (unexpected) {
      setError(describeAuthError(unexpected));
    } finally {
      setBusy(false);
    }
  }

  if (checkInbox) {
    return (
      <div className="panel mx-auto max-w-md space-y-4 p-6 text-center">
        <EnvelopeSimpleIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold">Проверь почту</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Мы отправили письмо на {email}. Подтверди адрес, потом вернись на эту же ссылку и войди — код
          привяжется автоматически.
        </p>
      </div>
    );
  }

  return (
    <div className="panel mx-auto max-w-md space-y-5 p-6">
      <header className="text-center">
        <h1 className="text-xl font-semibold">Приглашение от {studentName ?? "ребёнка"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Заведи свой собственный вход — отдельный от ученического. После входа ты увидишь план{" "}
          {studentName ?? "ребёнка"} для чтения.
        </p>
      </header>

      <Tabs value={mode} onValueChange={(value) => setMode(value as "signup" | "signin")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signup">Создать аккаунт</TabsTrigger>
          <TabsTrigger value="signin">У меня уже есть</TabsTrigger>
        </TabsList>

        <TabsContent value={mode} className="mt-4">
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field label="Имя">
                {({ id, describedBy }) => (
                  <input
                    id={id}
                    aria-describedby={describedBy}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="given-name"
                    className={inputClass}
                  />
                )}
              </Field>
            )}
            <Field label="Email">
              {({ id, describedBy }) => (
                <input
                  id={id}
                  type="email"
                  required
                  aria-describedby={describedBy}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className={inputClass}
                />
              )}
            </Field>
            <Field label="Пароль" hint={mode === "signup" ? "Минимум 6 символов" : undefined}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  type="password"
                  required
                  minLength={6}
                  aria-describedby={describedBy}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className={inputClass}
                />
              )}
            </Field>

            {error !== undefined && (
              <p role="alert" className="text-xs font-medium text-critical-ink">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="min-h-11 w-full" disabled={busy}>
              {busy ? "Секунду…" : mode === "signup" ? "Создать аккаунт" : "Войти"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
