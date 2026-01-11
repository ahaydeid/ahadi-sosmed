import Image from "next/image";
import { UserPlus, BadgeCheck, Forward, MessageCircle } from "lucide-react";

interface AvatarSectionProps {
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
  bio?: string | null;
  isOwnProfile: boolean;
  isFollowing: boolean;
  mainFollowLabel: string;
  showUserPlusIcon: boolean;
  onToggleFollow: () => void;
  onSecondary: () => void;
  children?: React.ReactNode;
  savedLink?: React.ReactNode;
}

export default function AvatarSection({ displayName, avatarUrl, verified, bio, isOwnProfile, isFollowing, mainFollowLabel, showUserPlusIcon, onToggleFollow, onSecondary, children, savedLink }: AvatarSectionProps) {
  return (
    <div className="flex flex-col items-center text-center pt-6">
      <div className="relative w-24 h-24 mb-3">
        <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          {avatarUrl ? <Image src={avatarUrl} alt={displayName} width={96} height={96} className="object-cover w-24 h-24" /> : <div className="w-12 h-12 rounded-full bg-gray-300" />}
        </div>
        {verified && (
          <div className="absolute bottom-0 -right-1">
            <BadgeCheck className="w-7 h-7 text-sky-500 fill-white" />
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
        {displayName}
      </h1>

      {children && <div className="mb-4">{children}</div>}
      {bio && <p className="text-gray-900 text-base mb-3 max-w-sm text-center leading-relaxed px-4">{bio}</p>}

      <div className="flex justify-center gap-3 mb-4">
        {!isOwnProfile && (
          <button
            onClick={onToggleFollow}
            className={`px-4 py-2 min-w-[120px] rounded-md text-sm font-medium transition flex items-center justify-center gap-1 ${
              isFollowing ? "bg-gray-200 text-gray-800 border border-gray-300 hover:bg-gray-300 italic" : "bg-sky-600 text-white hover:bg-sky-700"
            }`}
          >
            {showUserPlusIcon && <UserPlus className="w-4 h-4" />}
            {mainFollowLabel}
          </button>
        )}
        <button onClick={onSecondary} className="bg-gray-100 border border-gray-300 min-w-[120px] text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2">
          {isOwnProfile ? (
            <>
              <Forward className="w-4 h-4" />
              <span>Bagikan profil saya</span>
            </>
          ) : (
            <>
              <MessageCircle className="w-4 h-4" />
              <span>Kirim pesan</span>
            </>
          )}
        </button>
        {savedLink}
      </div>
    </div>
  );
}
