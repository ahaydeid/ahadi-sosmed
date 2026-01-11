"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationHandler() {
  const pathname = usePathname();
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const initPush = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }

      if (Notification.permission !== "granted") return;

      const { data } = await supabase.auth.getSession();
      currentUserIdRef.current = data.session?.user?.id ?? null;

      if (!currentUserIdRef.current) return;

      try {
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        await fetch("/api/notifications/subscribe", {
          method: "POST",
          body: JSON.stringify({ subscription }),
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Failed to subscribe to push notifications:", err);
      }
    };

    initPush();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      const oldUserId = currentUserIdRef.current;
      currentUserIdRef.current = session?.user?.id ?? null;

      if (currentUserIdRef.current && currentUserIdRef.current !== oldUserId) {
        initPush();
      }
    });

    const channel = supabase
      .channel("global_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_content",
        },
        async (payload) => {
          const newMsg = payload.new;
          if (!currentUserIdRef.current || newMsg.sender_id === currentUserIdRef.current) return;

          if (document.visibilityState === "visible") {
            if (pathname.includes(newMsg.sender_id)) return;

            const { data: sender } = await supabase
              .from("user_profile")
              .select("display_name, avatar_url")
              .eq("id", newMsg.sender_id)
              .single();

            new Notification(`Pesan dari ${sender?.display_name || "Seseorang"}`, {
              body: newMsg.text || "[Gambar]",
              icon: sender?.avatar_url || "/icon.png",
            });
          }
        }
      )
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [pathname]);

  return null;
}
