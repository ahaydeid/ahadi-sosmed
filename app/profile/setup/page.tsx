"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import VerifiedBadge from "@/app/components/ui/VerifiedBadge";
import Link from "next/link";
import { useSidebar } from "@/app/context/SidebarContext";

export default function EditProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const { isCollapsed } = useSidebar();

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id ?? null;
      if (!uid) {
        router.push("/login");
        return;
      }
      setUserId(uid);

      const { data, error } = await supabase.from("user_profile").select("display_name, bio, verified").eq("id", uid).maybeSingle();

      if (error) {
        console.error("Gagal memuat profil:", error.message);
        setError("Gagal memuat data profil");
      } else if (data) {
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setIsVerified(data.verified ?? false);
      }
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (bio.length > 200) {
      setError("Bio maksimal 200 karakter");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: any = {
      bio: bio.trim(),
      updated_at: new Date().toISOString(),
    };

    if (!isVerified) {
      payload.display_name = displayName.trim();
    }

    const { error: updateError } = await supabase
      .from("user_profile")
      .update(payload)
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      console.error("Gagal menyimpan:", updateError.message);
      setError("Gagal menyimpan perubahan");
      return;
    }

    setShowSuccessModal(true);
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    if (userId) router.push(`/profile/${userId}`);
  };

  if (loading) {
    return <p className="text-center py-10 text-gray-500">Memuat profil...</p>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header 
        className={`fixed top-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center px-4 transition-all duration-300 ${isCollapsed ? "left-0 md:left-20" : "left-0 md:left-64"}`}
      >
        <button 
          onClick={() => router.back()} 
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition text-gray-700"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="ml-2 text-lg font-bold text-gray-800">Edit Profil</h1>
      </header>

      <div className="max-w-md mx-auto px-4 pt-20 pb-8 relative">

      {error && <div className="bg-red-100 text-red-700 px-3 py-2 mb-4 rounded-md text-sm">{error}</div>}

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Tampilan Nama
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            disabled={isVerified}
            className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 ${isVerified ? "bg-gray-100 cursor-not-allowed opacity-75" : ""}`}
          />
          {isVerified && (
            <p className="text-[10px] text-sky-600 mt-1 italic">
              Nama tidak dapat diubah karena akun Anda sudah terverifikasi.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={4}
            placeholder="Tulis sedikit tentang dirimu..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <p className="text-xs text-gray-500 mt-1">{bio.length}/200 karakter</p>
        </div>

        <button type="submit" disabled={saving} className={`w-full py-2 rounded-md text-white font-medium ${saving ? "bg-sky-300 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700 transition"}`}>
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>

      {/* Verified Badge Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
          
        {isVerified ? (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
            <p className="text-sm text-sky-800 flex items-center justify-center gap-2">
              <VerifiedBadge className="w-4 h-4" />
              Akun kamu sudah verified
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Badge verified menunjukkan bahwa akun kamu adalah akun resmi.
            </p>
            <Link
              href="/verify"
              className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm flex items-center justify-center gap-2"
            >
              <VerifiedBadge className="w-5 h-5" />
              Ajukan Verified
            </Link>
          </div>
        )}
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80 text-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Berhasil Disimpan!</h2>
            <p className="text-gray-600 text-sm mb-4">Profil kamu berhasil diperbarui.</p>
            <button onClick={handleCloseModal} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition">
              OK
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
