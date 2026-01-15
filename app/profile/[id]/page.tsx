"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useProfileData } from "./logic/useProfileData";
import { useFollowData } from "./logic/useFollowData";
import Header from "./ui/Header";
import AvatarSection from "./ui/AvatarSection";
import StatsSection from "./ui/StatsSection";
import PostList from "./ui/PostList";
import FollowModal from "./ui/FollowModal";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import ConfirmModal from "@/app/components/ConfirmModal";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const profileId = id;
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");

  const profile = useProfileData(profileId);
  const follow = useFollowData(profileId, setShowFollowModal, setFollowTab);

  return (
    <div className="min-h-screen bg-gray-50 pb-16 pt-14">
      <Header 
        displayName={profile.displayName} 
        verified={profile.verified} 
        onLogout={() => setShowLogoutModal(true)} 
        isOwnProfile={profile.isOwnProfile} 
      />

      <AvatarSection
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        verified={profile.verified}
        bio={profile.bio}
        isOwnProfile={profile.isOwnProfile}
        isFollowing={profile.isFollowing}
        mainFollowLabel={profile.mainFollowLabel}
        showUserPlusIcon={profile.showUserPlusIcon}
        onToggleFollow={profile.handleToggleFollow}
        onSecondary={profile.handleSecondary}
        savedLink={
          profile.isOwnProfile && (
           <Link
            href="/profile/saved"
            className="flex items-center justify-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition whitespace-nowrap"
          >
            <Bookmark className="w-4 h-4 text-sky-500" />
            <h1>Post Tersimpan
              <span className="font-normal ml-1 text-gray-600">
                ({profile.savedCount})
              </span>
            </h1>
          </Link>
          )
        }
      >
        <StatsSection posts={profile.posts} followersCount={profile.followersCount} followingCount={profile.followingCount} onOpenFollowers={follow.openFollowersModal} onOpenFollowing={follow.openFollowingModal} />
      </AvatarSection>

      <PostList posts={profile.posts} loading={profile.loading} isOwner={profile.isOwnProfile} canPost={profile.canPost} />

      {showFollowModal && <FollowModal followTab={followTab} setShowFollowModal={setShowFollowModal} follow={follow} />}
      
      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={profile.handleLogout}
        title="Keluar Akun?"
        message="Apakah kamu yakin ingin keluar dari akun ini?"
        confirmLabel="Keluar"
        cancelLabel="Batal"
        isDanger={true}
      />
    </div>
  );
}
