"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors/app-error";
import { handleError } from "@/lib/errors/handler";

export function useAuth() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          throw new AppError("AUTH_001", {
            message: authError.message,
            details: { email },
          });
        }

        router.push("/");
      } catch (err) {
        const result = handleError(err);
        setError(result.userMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });

        if (authError) {
          throw new AppError("AUTH_002", {
            message: authError.message,
            details: { email },
          });
        }

        // 检查是否需要邮箱确认
        // Supabase 在开启邮箱确认时，session 为 null，user 的 email_confirmed_at 也为 null
        if (data.user && !data.session) {
          // 注册成功但需要邮箱确认
          router.push("/login?registered=true");
        } else if (data.session) {
          // 自动确认（Supabase 关闭了邮箱确认），直接跳转到 Dashboard
          router.push("/");
        } else {
          // 其他情况也跳转到登录页
          router.push("/login?registered=true");
        }
      } catch (err) {
        const result = handleError(err);
        setError(result.userMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const signInWithOAuth = useCallback(
    async (provider: "google" | "github") => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
          provider,
        });
      } catch (err) {
        const result = handleError(err);
        setError(result.userMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      const result = handleError(err);
      setError(result.userMessage);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return {
    isLoading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    signOut,
  };
}
