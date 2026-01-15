"use client";

import type { Route } from "next";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { Search, User } from "lucide-react";
import VerifiedBadge from "./ui/VerifiedBadge";
import Image from "next/image";
import Link from "next/link";
import { incrementPostViews } from "@/lib/actions/incrementViews";

type TabKey = "teratas" | "followed";
type SearchItem = { type: "user"; id: string; label: string; avatarUrl?: string | null; verified?: boolean } | { type: "post"; id: string; label: string; thumbnailUrl?: string | null };

function TopBarInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = (searchParams.get("tab") as TabKey) || "teratas";
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      if (data.session?.user) {
        // canPost logic removed
      }
    };
    run();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setIsLoggedIn(!!s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSearching) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);

    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearching(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearching]);

  // search debounced
  useEffect(() => {
    if (!isSearching) return;
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
          supabase.from("user_profile").select("id, display_name, avatar_url, verified").ilike("display_name", `%${query.trim()}%`).limit(8),
          supabase
            .from("post_content")
            .select("slug, post_id, title")
            .ilike("title", `%${query.trim()}%`)
            .limit(8),
        ]);

        if (cancelled) return;

        const users: SearchItem[] =
          usersRes.data?.map((u) => ({
            type: "user",
            id: u.id as string,
            label: (u.display_name as string) ?? "Pengguna",
            avatarUrl: (u.avatar_url as string) ?? null,
            verified: u.verified as boolean,
          })) ?? [];

        const posts: SearchItem[] =
          postsRes.data?.map((p) => ({
            type: "post",
            id: p.slug as string,
            label: (p.title as string) ?? "(Tanpa judul)",
            thumbnailUrl: null,
            post_id: p.post_id as string,
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
  }, [isSearching, query]);

  const setTabInUrl = (val: TabKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", val);
    const href = `${pathname}?${sp.toString()}` as unknown as Route;
    router.replace(href);
  };

  const handleTab = (val: TabKey) => {
    setActiveTab(val);
    setTabInUrl(val);
  };



  const handlePick = async (item: SearchItem & { post_id?: string }) => {
    if (item.type === "post") {
      if (item.post_id) await incrementPostViews(item.post_id);
      router.push(`/post/${item.id}`);
    } else {
      router.push(`/profile/${item.id}`);
    }
    setIsSearching(false);
    setQuery("");
    setResults([]);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Escape") {
      setIsSearching(false);
      setQuery("");
      setResults([]);
    }
  };

  const closeMobileSearch = () => {
    setIsSearching(false);
    setQuery("");
    setResults([]);
  };

  if (!mounted) return <div className="h-12 border-b border-gray-200 bg-white" />;

  return (
    <div suppressHydrationWarning className="sticky top-0 mb-1 z-40 bg-white border-b border-gray-200" ref={searchRef}>
      <div suppressHydrationWarning className="flex items-center justify-between px-4 h-12">
        <div suppressHydrationWarning className={`flex items-center space-x-4 ${isSearching ? 'hidden md:flex' : 'flex'}`}>
          <button onClick={() => handleTab("teratas")} className={`text-sm ${activeTab === "teratas" ? "font-semibold text-black" : "text-gray-500"}`}>
            Teratas
          </button>

          <button
            onClick={() => {
              if (!isLoggedIn) return;
              handleTab("followed");
            }}
            disabled={!isLoggedIn}
            className={`text-sm transition ${!isLoggedIn ? "text-gray-300 cursor-not-allowed" : activeTab === "followed" ? "font-semibold text-black" : "text-gray-500 hover:text-black"}`}
          >
            Diikuti
          </button>
        </div>

        <div className={`flex items-center space-x-4 flex-1 justify-end`}>
          {/* Search Wrapper */}
          <div className={`relative ${isSearching ? 'w-full md:w-[450px] ml-0' : 'w-auto md:w-[200px]'}`}>
            <div className={`flex items-center gap-2 rounded-full transition-all duration-300 ${isSearching ? 'bg-gray-100 px-4 h-9 w-full' : 'bg-transparent md:bg-gray-100 md:px-4 md:h-9 md:w-full'}`}>
              
              {/* Mobile Icon Button */}
              {!isSearching && (
                <button 
                  onClick={() => setIsSearching(true)}
                  className="w-9 h-9 md:hidden text-gray-500 hover:bg-gray-100 rounded-full flex items-center justify-center shrink-0"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}

              {/* Desktop Icon & Input (Visible if isSearching or MD+) */}
              <div className={`${isSearching ? 'flex' : 'hidden md:flex'} items-center gap-2 w-full`}>
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIsSearching(true);
                  }}
                  onFocus={() => setIsSearching(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Cari"
                  className="bg-transparent outline-none text-sm w-full"
                />
                
                {/* Clear button for search (visible on mobile if searching, or on desktop if query exists) */}
                {(isSearching || query.length > 0) && (
                  <button 
                    onClick={closeMobileSearch}
                    className="text-gray-400 p-1 hover:text-gray-600 transition-colors"
                    title="Bersihkan pencarian"
                  >
                    <span className="text-xs font-bold px-1">×</span>
                  </button>
                )}
              </div>
            </div>
            {isSearching && (query.trim() !== "" || loading) && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 border-b border-gray-50">
                  {loading && <div className="px-3 py-2 text-sm text-gray-500">Mencari…</div>}
                  {!loading && results.length === 0 && query.trim().length > 0 && <div className="px-3 py-2 text-sm text-gray-500">Tidak ada hasil</div>}
                  {!loading &&
                    results.map((item) => (
                      <Link 
                        key={`${item.type}-${item.id}`} 
                        href={item.type === "post" ? `/post/${item.id}` : `/profile/${item.id}` as any}
                        onClick={() => handlePick(item as any)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-3"
                      >
                        {item.type === "user" ? (
                          item.avatarUrl ? (
                            <Image src={item.avatarUrl} alt={item.label} width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <User className="w-6 h-6 text-gray-400 shrink-0" />
                          )
                        ) : item.thumbnailUrl ? (
                          <Image src={item.thumbnailUrl} alt={item.label} width={40} height={24} className="w-10 h-6 rounded object-cover shrink-0" />
                        ) : null}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <div className="font-medium text-gray-900 truncate">{item.label}</div>
                            {item.type === "user" && item.verified && <VerifiedBadge className="w-3 h-3" />}
                          </div>
                          <div className="text-gray-500 text-xs">{item.type === "user" ? "Pengguna" : "Post"}</div>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>


        </div>
      </div>




    </div>
  );
}

export default function TopBar() {
  return (
    <Suspense fallback={<div className="h-12" />}>
      <TopBarInner />
    </Suspense>
  );
}
