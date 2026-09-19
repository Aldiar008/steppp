import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * Every Supabase auth failure, in the applicant's own language.
 *
 * Kept as one pure function rather than scattered `catch` blocks so the four
 * screens that call Supabase Auth (sign in, sign up, the parent join form,
 * the OAuth callback's failure redirect) show the same wording for the same
 * failure — and so the mapping itself is testable without a network.
 */
export function describeAuthError(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return "Не получилось связаться с сервером. Проверь соединение и попробуй ещё раз.";
  }

  if (isAuthApiError(error)) {
    switch (error.code) {
      case "invalid_credentials":
        return "Неверный email или пароль.";
      case "user_already_exists":
      case "email_exists":
      case "identity_already_exists":
        return "Этот email уже используется — возможно, это твой аккаунт другой роли. Родителю и ученику нужны разные email.";
      case "email_not_confirmed":
        return "Email ещё не подтверждён — проверь почту и перейди по ссылке из письма.";
      case "weak_password":
        return "Пароль слишком простой: нужно минимум 6 символов.";
      case "over_email_send_rate_limit":
      case "over_request_rate_limit":
        return "Слишком много попыток подряд. Подожди немного и попробуй снова.";
      case "email_address_invalid":
        return "Это не похоже на email — проверь адрес.";
      case "signup_disabled":
      case "email_provider_disabled":
        return "Регистрация сейчас недоступна. Попробуй позже.";
      case "same_password":
        return "Это тот же пароль, что и раньше.";
      default:
        return error.message;
    }
  }

  if (error instanceof Error) return error.message;
  return "Что-то пошло не так. Попробуй ещё раз.";
}
