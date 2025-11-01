import { X, BadgeCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { SimpleProfile } from "../logic/useFollowData";

interface FollowModalProps {
  followTab: "followers" | "following";
  setShowFollowModal: (v: boolean) => void;
  follow: {
    followers: SimpleProfile[];
    following: SimpleProfile[];
    loadingFollowList: boolean;
    followingSet: Set<string>;
    followsMeSet: Set<string>;
    currentUserId: string | null;
    handleItemFollowToggle: (id: string) => Promise<void>;
  };
}

export default function FollowModal({ followTab, setShowFollowModal, follow }: FollowModalProps) {
  const list = followTab === "followers" ? follow.followers : follow.following;
  const loading = follow.loadingFollowList;

  return (
    <div className="fixed inset-0 z-50 mb-13 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowFollowModal(false)} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">{followTab === "followers" ? "Pengikut" : "Mengikuti"}</h3>
          <button onClick={() => setShowFollowModal(false)} aria-label="Tutup" className="p-2 rounded-md hover:bg-gray-100 text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3">
          {loading && <p className="text-center py-4 text-gray-500">Memuat daftar...</p>}
          {!loading && list.length === 0 && <p className="text-center py-6 text-gray-500">{followTab === "followers" ? "Belum ada pengikut" : "Belum mengikuti siapa pun"}</p>}
          {!loading && list.length > 0 && (
            <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-auto">
              {list.map((u: SimpleProfile) => {
                const iFollow = follow.followingSet.has(u.id);
                const theyFollowMe = follow.followsMeSet.has(u.id);
                const label = iFollow ? "Mengikuti" : theyFollowMe ? "Ikuti balik" : "Ikuti";

                return (
                  <li key={u.id} className="flex items-center gap-3 p-3">
                    <Link href={`/profile/${u.id}`} className="flex items-center gap-3 flex-1 hover:bg-gray-50 rounded-md" onClick={() => setShowFollowModal(false)}>
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                        {u.avatar_url ? <Image src={u.avatar_url} alt={u.display_name} width={40} height={40} className="object-cover w-10 h-10" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
                        {u.verified && (
                          <div className="absolute bottom-0 right-0 bg-white rounded-full p-0.5">
                            <BadgeCheck className="w-3 h-3 text-sky-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                          {u.display_name}
                          {u.verified && <BadgeCheck className="w-4 h-4 text-sky-500" />}
                        </p>
                        <p className="text-xs text-gray-500">Lihat profil</p>
                      </div>
                    </Link>
                    {follow.currentUserId && follow.currentUserId !== u.id && (
                      <button
                        onClick={() => follow.handleItemFollowToggle(u.id)}
                        className={`px-3 py-1 text-xs rounded-md border transition ${iFollow ? "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300 italic" : "bg-sky-600 text-white border-sky-700 hover:bg-sky-700"}`}
                      >
                        {label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
