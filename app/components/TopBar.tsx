"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, User } from "lucide-react";
import Image from "next/image";

type TabKey = "teratas" | "followed";
type SearchItem = { type: "user"; id: string; label: string; avatarUrl?: string | null } | { type: "post"; id: string; label: string; thumbnailUrl?: string | null };

function TopBarInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = (searchParams.get("tab") as TabKey) || "teratas";
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // sinkronkan tombol aktif dgn URL
  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  // session
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    run();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setIsLoggedIn(!!s));
    return () => subscription.unsubscribe();
  }, []);

  // focus input saat open
  useEffect(() => {
    if (!openSearch) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [openSearch]);

  // search debounced
  useEffect(() => {
    if (!openSearch) return;
    let cancelled = false;
    let id: ReturnType<typeof setTimeout> | null = null;

    const go = async () => {
      if (!query.trim()) {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(true);

      id = setTimeout(async () => {
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

    go();
    return () => {
      cancelled = true;
      if (id) clearTimeout(id);
    };
  }, [openSearch, query]);

  // util: update ?tab= tanpa hapus query lain
  const setTabInUrl = (val: TabKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", val);
    router.replace(`${pathname}?${sp.toString()}`);
  };

  const handleTab = (val: TabKey) => {
    setActiveTab(val);
    setTabInUrl(val);
  };

  const handleGoLogin = () => {
    const qs = searchParams?.toString() ?? "";
    const current = pathname ? pathname + (qs ? `?${qs}` : "") : "/";
    router.push(`/login?redirectedFrom=${encodeURIComponent(current)}`);
  };

  const handleOpenSearch = () => {
    if (!isLoggedIn) return handleGoLogin();
    setOpenSearch((v) => !v);
    if (!openSearch) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  };

  const handlePick = (item: SearchItem) => {
    if (item.type === "post") router.push(`/post/${item.id}`);
    else router.push(`/profile/${item.id}`);
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
          <button onClick={() => handleTab("teratas")} className={`text-sm ${activeTab === "teratas" ? "font-semibold text-black" : "text-gray-500"}`}>
            Teratas
          </button>
          <button onClick={() => handleTab("followed")} className={`text-sm ${activeTab === "followed" ? "font-semibold text-black" : "text-gray-500"}`}>
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
            <div className="border border-gray-300 rounded-md overflow-hidden absolute z-10 w-full bg-white shadow-lg">
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

export default function TopBar() {
  // Bungkus dengan Suspense agar aman untuk useSearchParams (Next 16)
  return (
    <Suspense fallback={<div className="h-12" />}>
      <TopBarInner />
    </Suspense>
  );
}
