/**
 * @module supabase/client
 * @description 浏览器端 Supabase 客户端实例。
 * @author ClipSync Team
 * @created 2026-04-12
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
