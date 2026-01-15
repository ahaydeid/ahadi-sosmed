"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface BookmarkButtonProps {
  postId: string;
  initialSaved?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  activeLabel?: string;
  className?: string;
  onToggle?: (isSaved: boolean) => void;
}

export default function BookmarkButton({
  postId,
  initialSaved = false,
  size = "md",
  showLabel = false,
  label = "Bookmark",
  activeLabel = "Bookmark",
  className,
  onToggle,
}: BookmarkButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  // Fetch initial saved state
  useEffect(() => {
    const checkSavedStatus = async () => {
      try {
        // Check if user is logged in first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsChecking(false);
          return;
        }

        const response = await fetch(`/api/posts/${postId}/saved`);
        if (!response.ok) {
          setIsChecking(false);
          return;
        }
        const data = await response.json();
        setIsSaved(data.isSaved);
      } catch (error) {
        console.error("Error checking saved status:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkSavedStatus();
  }, [postId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    const previousState = isSaved;

    // Optimistic update
    setIsSaved(!isSaved);

    try {
      const response = await fetch("/api/posts/save", {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Revert on error
        setIsSaved(previousState);
        alert(data.message || "Failed to update bookmark");
        return;
      }

      // Call onToggle callback if provided
      if (onToggle) {
        onToggle(!previousState);
      }

      // Refresh router and broadcast event
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("saved-posts:refresh"));
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      // Revert on error
      setIsSaved(previousState);
      alert("Failed to update bookmark");
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show anything while checking
  if (isChecking) {
    return (
      <div className={`${sizeClasses[size]} animate-pulse bg-gray-200 rounded`}></div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={className || `
        flex items-center gap-1.5 transition-all
        ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:text-sky-400"}
        ${isSaved ? "text-sky-500" : "text-gray-500"}
      `}
      title={isSaved ? "Hapus bookmark" : "Simpan tulisan ini"}
    >
      <Bookmark
        className={`${sizeClasses[size]} transition-all ${
          isSaved ? "fill-current" : ""
        }`}
      />
      {showLabel && (
        <span className="text-sm">
          {isSaved ? activeLabel : label}
        </span>
      )}
    </button>
  );
}

