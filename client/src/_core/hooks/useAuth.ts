import { EXPLICIT_SIGNED_OUT_STORAGE_KEY, startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  // Login is started via startLogin() in the effect below, only when we actually
  // navigate — never during render. startLogin() mints a one-time nonce + writes
  // the state cookie, so calling it per render would overwrite the cookie and
  // desync it from an in-flight login's `state`.
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  // `sessionStorage` is updated synchronously by logout(). The mutation's
  // pending/settled transitions cause a render, so reading it here makes the
  // public signed-out state authoritative even when an older auth.me request
  // completes after sign-out.
  const isExplicitlySignedOut = (() => {
    try {
      return sessionStorage.getItem(EXPLICIT_SIGNED_OUT_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  })();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !isExplicitlySignedOut,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    // Mark this browser as intentionally signed out before any in-flight
    // protected request can fail and trigger the global unauthorized handler.
    // The marker is removed only by an explicit sign-in action.
    try {
      sessionStorage.setItem(EXPLICIT_SIGNED_OUT_STORAGE_KEY, "1");
      sessionStorage.removeItem("manus-cookie");
      localStorage.removeItem("manus-runtime-user-info");
    } catch {}
    // Evict the cached identity before the logout request settles. This keeps
    // the shell public even if an earlier auth.me response resolves late.
    utils.auth.me.setData(undefined, null);
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      // Clear the Preview auto-login token mirrored into sessionStorage, so
      // header-based sessions (Safari ITP / WebView) are logged out too. The
      // backend cookie is cleared by the logout mutation.
      utils.auth.me.setData(undefined, null);
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    if (!isExplicitlySignedOut) {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(meQuery.data)
      );
    }
    return {
      user: isExplicitlySignedOut ? null : meQuery.data ?? null,
      loading: (!isExplicitlySignedOut && meQuery.isLoading) || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: !isExplicitlySignedOut && Boolean(meQuery.data),
    };
  }, [
    isExplicitlySignedOut,
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (isExplicitlySignedOut) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    // Navigate at this moment only. startLogin() mints the nonce + cookie itself.
    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      startLogin();
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    isExplicitlySignedOut,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
