"use client";

import type { Route } from "next";
import { useEffect, useState, useCallback, useRef } from "react";
import { Home, Megaphone, MessageSquare, Bell, User, Menu, Check, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSidebar } from "../context/SidebarContext";
import NextImage from "next/image";

export default function BottomNavbar() {
  const pathname = usePathname();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [profile, setProfile] = useState<{ avatar_url: string | null; display_name: string | null; email?: string } | null>(null);
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);
  
  // Race condition protection
  const lastComputeId = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = useCallback((path: string) => {
    const normalizedPathname = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
    return normalizedPathname === normalizedPath || (path === "/" && normalizedPathname === "");
  }, [pathname]);

  const isChatDetail = pathname.startsWith("/chat/") && pathname !== "/chat";

  // ===== Auth session =====
  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (active) {
        setCurrentUserId(data.session?.user?.id ?? null);
      }
    };
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        const uid = session?.user?.id ?? null;
        setCurrentUserId(uid);
        if (!session) {
          setUnreadChatCount(0);
          setUnreadNotifCount(0);
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // ===== Fetch Profile =====
  useEffect(() => {
    if (!currentUserId) {
      setProfile(null);
      return;
    }
    const fetchProfile = async () => {
      const { data } = await supabase.from("user_profile").select("display_name, avatar_url").eq("id", currentUserId).maybeSingle();
      const { data: { user } } = await supabase.auth.getUser();
      if (data) setProfile({ avatar_url: data.avatar_url, display_name: data.display_name, email: user?.email });
    };
    fetchProfile();
  }, [currentUserId]);

  const computeUnreadChats = useCallback(async () => {
    if (!currentUserId) return;
    
    const computeId = ++lastComputeId.current;
    
    try {
      const { data, error } = await supabase.rpc('get_unread_chat_count', {
        user_id_param: currentUserId
      });

      if (error) throw error;

      if (computeId === lastComputeId.current) {
        setUnreadChatCount(data ?? 0);
      }
    } catch (error) {
      console.error("Navbar: Error computing unread chats:", error);
    }
  }, [currentUserId]);

  const computeUnreadNotif = useCallback(async () => {
    if (!currentUserId) return;
    const computeId = lastComputeId.current; // Use same counter or separate
    try {
      const { data, error } = await supabase.from("notifications")
        .select("type, reference_post_id, reference_comment_id, is_read")
        .eq("user_id", currentUserId)
        .eq("is_read", false);

      if (error) throw error;
      if (!data) return;

      const uniqueGroups = new Set(data.map((n) => (
        n.reference_post_id ? `${n.type}_${n.reference_post_id}` : 
        n.reference_comment_id ? `${n.type}_${n.reference_comment_id}` : 
        `${n.type}_${Math.random()}`
      )));
      
      if (computeId === lastComputeId.current) {
        setUnreadNotifCount(uniqueGroups.size);
      }
    } catch (e) {
      console.error("Navbar: Error computing notifications:", e);
    }
  }, [currentUserId]);

  // ===== Initial compute & Realtime =====
  useEffect(() => {
    if (!mounted || !currentUserId) return;

    void computeUnreadChats();
    void computeUnreadNotif();

    const channel = supabase.channel("nav_sync_unified")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void computeUnreadChats())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages_content" }, () => void computeUnreadChats())
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads" }, () => void computeUnreadChats())
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` }, () => void computeUnreadNotif())
      .subscribe();

    const onFocus = () => {
      void computeUnreadChats();
      void computeUnreadNotif();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [mounted, currentUserId, computeUnreadChats, computeUnreadNotif]);

  const profileHref = (currentUserId ? `/profile/${currentUserId}` : `/login?redirectedFrom=${encodeURIComponent("/profile")}`) as Route;
  const profileActive = currentUserId ? pathname.startsWith(`/profile/${currentUserId}`) : false;

  return (
    <>
      {/* ===== MOBILE NAVBAR ===== */}
      {!isChatDetail && (
        <nav suppressHydrationWarning className="fixed bottom-0 left-0 w-full bg-white shadow z-50 md:hidden">
          <ul suppressHydrationWarning className="flex justify-around items-center h-14 px-2">
            <li>
              <Link href={"/" as Route} className="relative flex flex-col items-center">
                <Home className={`w-6 h-6 ${isActive("/") ? "text-black" : "text-gray-400"}`} />
                {mounted && isActive("/") && <div suppressHydrationWarning className="w-6 h-0.5 bg-black rounded-full mt-1" />}
              </Link>
            </li>

            <li>
              <Link href={"/marah-marah" as Route} className="relative flex flex-col items-center">
                <Megaphone className={`w-6 h-6 ${isActive("/marah-marah") ? "text-black" : "text-gray-400"}`} />
                {mounted && isActive("/marah-marah") && <div suppressHydrationWarning className="w-6 h-0.5 bg-black rounded-full mt-1" />}
              </Link>
            </li>

            <li>
              <Link href={"/chat" as Route} className="relative flex flex-col items-center">
                <MessageSquare className={`w-6 h-6 ${isActive("/chat") ? "text-black" : "text-gray-400"}`} />
                {mounted && unreadChatCount > 0 && (
                  <span suppressHydrationWarning className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center border-2 border-white">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
                {mounted && isActive("/chat") && <div suppressHydrationWarning className="w-6 h-0.5 bg-black rounded-full mt-1" />}
              </Link>
            </li>

            <li>
              <Link href={"/notif" as Route} className="relative flex flex-col items-center">
                <Bell className={`w-6 h-6 ${isActive("/notif") ? "text-black" : "text-gray-400"}`} />
                {mounted && unreadNotifCount > 0 && (
                  <span suppressHydrationWarning className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center border-2 border-white">
                    {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                  </span>
                )}
                {mounted && isActive("/notif") && <div suppressHydrationWarning className="w-6 h-0.5 bg-black rounded-full mt-1" />}
              </Link>
            </li>

            <li>
              <Link href={profileHref} className="relative flex flex-col items-center">
                <div suppressHydrationWarning className="relative">
                  {profile?.avatar_url ? (
                    <div suppressHydrationWarning className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all ${profileActive ? "border-black" : "border-gray-200"}`}>
                      <NextImage src={profile.avatar_url} alt="Profil" width={24} height={24} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div suppressHydrationWarning className={`w-6 h-6 flex items-center justify-center rounded-full border-2 transition-all ${profileActive ? "border-black" : "border-gray-200"}`}>
                      <User className={`w-4 h-4 ${profileActive ? "text-black" : "text-gray-400"}`} />
                    </div>
                  )}
                </div>
                {mounted && profileActive && <div suppressHydrationWarning className="w-6 h-0.5 bg-black rounded-full mt-1" />}
              </Link>
            </li>
          </ul>
        </nav>
      )}

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside suppressHydrationWarning className={`hidden md:fixed md:inset-y-0 md:left-0 md:bg-white md:z-40 md:flex md:flex-col border-r border-gray-100 transition-all duration-300 ${isCollapsed ? "md:w-20" : "md:w-64"}`}>
        <div suppressHydrationWarning className={`px-3 py-5 flex items-center md:mb-5 transition-all ${isCollapsed ? "justify-center" : "relative min-h-[44px]"}`}>
          <button
            onClick={toggleSidebar}
            className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ${!isCollapsed ? "absolute left-[18px]" : ""}`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Menu size={22} />
          </button>
          {!isCollapsed && (
            <div suppressHydrationWarning className="flex-1 text-center">
              <Link href="/" className="inline-block">
                <span
                  suppressHydrationWarning
                  className="text-xl font-bold truncate cursor-pointer hover:opacity-80"
                >
                  Ahadi
                </span>
              </Link>
            </div>
          )}
        </div>

        <nav suppressHydrationWarning className="flex-1 px-3 space-y-1">
          <NavItem href="/" icon={Home} label="Beranda" isActive={isActive("/")} isCollapsed={isCollapsed} />
          <NavItem href="/marah-marah" icon={Megaphone} label="Marah²" isActive={isActive("/marah-marah")} isCollapsed={isCollapsed} />
          <NavItem href="/chat" icon={MessageSquare} label="Chat" isActive={isActive("/chat")} isCollapsed={isCollapsed} badge={mounted ? unreadChatCount : 0} />
          <NavItem href="/notif" icon={Bell} label="Notifikasi" isActive={isActive("/notif")} isCollapsed={isCollapsed} badge={mounted ? unreadNotifCount : 0} />
          {["adihadi270@gmail.com", "adi.hadi270@gmail.com"].includes(profile?.email || "") && (
             <NavItem href="/admin/verify" icon={Check} label="Verify" isActive={isActive("/admin/verify")} isCollapsed={isCollapsed} />
          )}
        </nav>

        <div suppressHydrationWarning className={`mt-auto mb-5 px-3 ${isCollapsed ? "flex justify-center" : ""}`}>
          <NavItem
            href={profileHref}
            icon={profile?.avatar_url ? undefined : User}
            avatar={profile?.avatar_url}
            label={profile?.display_name ? profile.display_name.split(" ")[0] : "Login"}
            isActive={profileActive}
            isCollapsed={isCollapsed}
          />
        </div>
      </aside>
    </>
  );
}

interface NavItemProps {
  href: string;
  icon?: LucideIcon;
  avatar?: string | null;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  badge?: number;
}

function NavItem({ href, icon: Icon, avatar, label, isActive, isCollapsed, badge = 0 }: NavItemProps) {
  return (
    <Link
      suppressHydrationWarning
      href={href as Route}
      className={`relative flex items-center gap-3 px-3 py-2.5 transition-all group ${isActive ? "border-l-3 border-black text-black font-bold" : "text-gray-600 hover:bg-gray-50 hover:text-black"} ${isCollapsed ? "justify-center" : ""}`}
      title={isCollapsed ? label : ""}
    >
      <div suppressHydrationWarning className="relative flex items-center gap-3">
        {avatar ? (
          <div suppressHydrationWarning className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 shrink-0">
            <NextImage src={avatar} alt={label} width={24} height={24} className="w-full h-full object-cover" />
          </div>
        ) : (
          Icon && <Icon size={22} className={isActive ? "text-black stroke-[2.5px]" : "text-gray-500 group-hover:text-black"} />
        )}
        {!isCollapsed && <span suppressHydrationWarning className="truncate">{label}</span>}
        
        {badge > 0 && (
          <span
            suppressHydrationWarning
            className={`
            ${isCollapsed ? "absolute -top-1 -right-1" : "ml-auto"}
            bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
          `}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
    </Link>
  );
}
