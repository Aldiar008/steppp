"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightIcon, EnvelopeSimpleIcon, PlayCircleIcon } from "@phosphor-icons/react/dist/ssr";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Typewriter } from "@/components/ui/typewriter";
import { Field, inputClass } from "@/components/form";
import { describeAuthError } from "@/lib/auth/auth-errors";
import { createClient } from "@/lib/supabase/client";

/**
 * The real front door: sign in or create an account with email and a
 * password, nothing else. Everything the old name-only `SignInScreen` used to
 * promise ("никакого пароля, никакого сервера") is no longer true and
 * shouldn't be echoed here; what replaces it is a plain, honest account
 * screen.
 */
export function AuthScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [checkInbox, setCheckInbox] = useState(false);

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setBusy(true);
    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(describeAuthError(signInError));
          return;
        }
        router.push("/interview");
        return;
      }

      if (name.trim().length === 0) {
        setError("Напиши имя — так к тебе будет обращаться Stepwise.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "student", name: name.trim() } },
      });
      if (signUpError) {
        setError(describeAuthError(signUpError));
        return;
      }
      if (data.session === null) {
        setCheckInbox(true);
        return;
      }
      router.push("/interview");
    } finally {
      setBusy(false);
    }
  }

  if (checkInbox) {
    return (
      <div className="panel mx-auto w-full max-w-md space-y-4 p-6 text-center">
        <EnvelopeSimpleIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold">Проверь почту</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Мы отправили письмо на {email}. Перейди по ссылке в нём, чтобы подтвердить адрес, и
          возвращайся сюда — вход сработает сразу после этого.
        </p>
        <Button variant="outline" onClick={() => setCheckInbox(false)}>
          Назад
        </Button>
      </div>
    );
  }

  return (
    <div className="panel mx-auto w-full max-w-4xl overflow-hidden md:grid md:min-h-[560px] md:grid-cols-2">
      <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-6 px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Wordmark />
          <Button variant="outline" size="sm" asChild>
            <Link href="/demo">
              <PlayCircleIcon className="size-4" weight="duotone" aria-hidden />
              Демо без входа
            </Link>
          </Button>
        </div>

        <Tabs value={mode} onValueChange={(value) => setMode(value as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Войти</TabsTrigger>
            <TabsTrigger value="signup">Зарегистрироваться</TabsTrigger>
          </TabsList>

          <TabsContent value={mode} className="mt-4">
            <form onSubmit={submitPassword} className="space-y-3">
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

              <Field
                label="Пароль"
                hint={mode === "signup" ? "Минимум 6 символов" : undefined}
              >
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
                {busy ? "Секунду…" : mode === "signin" ? "Войти" : "Создать аккаунт"}
                {!busy && <ArrowRightIcon className="size-4" aria-hidden />}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Аккаунт нужен, чтобы вернуться к своим ответам с любого устройства. Личные вопросы — класс,
          интересы, бюджет — начнутся после входа, отдельным шагом.
        </p>
      </div>

      <div
        className="relative hidden md:block"
        style={{
          backgroundImage: "url(/landing/moon-texture.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="relative z-10 flex h-full flex-col items-center justify-end p-8 pb-10">
          <blockquote className="max-w-xs space-y-2 text-center">
            <p className="text-lg font-medium text-foreground">
              “
              <Typewriter text="Ни одной выдуманной даты — только то, что известно точно." speed={45} />
              ”
            </p>
            <cite className="block text-sm font-light text-muted-foreground not-italic">— Stepwise</cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
