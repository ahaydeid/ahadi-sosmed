"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, User } from "lucide-react";
import Image from "next/image";

type TabKey = "teratas" | "followed";
type SearchItem = { type: "user"; id: string; label: string; avatarUrl?: string | null } | { type: "post"; id: string; label: string; thumbnailUrl?: string | null };

export default function TopBar() {
  const [activeTab, setActiveTab] = useState<TabKey>("teratas");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    checkSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (openSearch) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [openSearch]);

  useEffect(() => {
    if (!openSearch) return;

    let cancelled = false;
    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      await Promise.resolve();

      if (!query.trim()) {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(true);

      debounceId = setTimeout(async () => {
        const [usersRes, postsRes] = await Promise.all([
          supabase.from("user_profile").select("id, display_name, avatar_url").ilike("display_name", `%${query.trim()}%`).limit(8),
          supabase.from("post_content").select("post_id, title, image_url").ilike("title", `%${query.trim()}%`).limit(8),
        ]);

        if (cancelled) return;

        const users: SearchItem[] =
          usersRes.data?.map((u) => ({
            type: "user",
            id: u.id as string,
            label: (u.display_name as string) ?? "Pengguna",
            avatarUrl: (u.avatar_url as string) ?? null,
          })) ?? [];

        const posts: SearchItem[] =
          postsRes.data?.map((p) => ({
            type: "post",
            id: p.post_id as string,
            label: (p.title as string) ?? "(Tanpa judul)",
            thumbnailUrl: (p.image_url as string) ?? null,
          })) ?? [];

        setResults([...users, ...posts]);
        setLoading(false);
      }, 200);
    };

    run();

    return () => {
      cancelled = true;
      if (debounceId) clearTimeout(debounceId);
    };
  }, [openSearch, query]);

  const handleGoLogin = () => {
    const qs = searchParams?.toString() ?? "";
    const current = pathname ? pathname + (qs ? `?${qs}` : "") : "/";
    router.push(`/login?redirectedFrom=${encodeURIComponent(current)}`);
  };

  const handleOpenSearch = () => {
    if (!isLoggedIn) {
      handleGoLogin();
      return;
    }
    setOpenSearch((v) => !v);
    if (!openSearch) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  };

  const handlePick = (item: SearchItem) => {
    if (item.type === "post") {
      router.push(`/post/${item.id}`);
    } else {
      router.push(`/profile/${item.id}`);
    }
    setOpenSearch(false);
    setQuery("");
    setResults([]);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Escape") {
      setOpenSearch(false);
      setQuery("");
      setResults([]);
    }
  };

  return (
    <div className="sticky top-0 mb-1 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 h-12">
        <div className="flex items-center space-x-4">
          <button onClick={() => setActiveTab("teratas")} className={`text-sm ${activeTab === "teratas" ? "font-semibold text-black" : "text-gray-500"}`}>
            Teratas
          </button>
          <button onClick={() => setActiveTab("followed")} className={`text-sm ${activeTab === "followed" ? "font-semibold text-black" : "text-gray-500"}`}>
            Diikuti
          </button>
        </div>

        {!isLoggedIn ? (
          <button onClick={handleGoLogin} className="bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-300 text-sm font-medium px-3 py-1.5 rounded transition-colors">
            Login
          </button>
        ) : (
          <button aria-label="Cari" onClick={handleOpenSearch} className="text-gray-700 hover:text-black transition">
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>

      {openSearch && (
        <div className="px-4">
          <div className="relative">
            {" "}
            <div className="border border-gray-300 rounded-md overflow-hidden absolute z-10 w-full bg-white">
              {" "}
              {/* PENTING: Tambahkan 'absolute', 'z-10', 'w-full', 'bg-white', dan 'shadow-lg' */}
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Cari pengguna atau judul post…" className="w-full px-3 py-2 text-sm outline-none" />
              <div className="max-h-72 overflow-y-auto divide-y border-b border-b-gray-100 divide-gray-100">
                {loading && <div className="px-3 py-2 text-sm text-gray-500">Mencari…</div>}
                {!loading && results.length === 0 && query.trim().length > 0 && <div className="px-3 py-2 text-sm text-gray-500">Tidak ada hasil</div>}
                {!loading &&
                  results.map((item) => (
                    <button key={`${item.type}-${item.id}`} onClick={() => handlePick(item)} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                      <div className="flex items-center gap-3">
                        {item.type === "user" ? (
                          item.avatarUrl ? (
                            <Image src={item.avatarUrl} alt={item.label} width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-gray-400" />
                          )
                        ) : item.thumbnailUrl ? (
                          <Image src={item.thumbnailUrl} alt={item.label} width={40} height={24} className="w-10 h-6 rounded object-cover" />
                        ) : null}

                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{item.label}</div>
                          <div className="text-gray-500 text-xs">{item.type === "user" ? "Pengguna" : "Post"}</div>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
