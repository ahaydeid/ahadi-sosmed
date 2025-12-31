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

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const profileId = id;
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");

  const profile = useProfileData(profileId);
  const follow = useFollowData(profileId, setShowFollowModal, setFollowTab);

  return (
    <div className="min-h-screen bg-gray-50 pb-16 pt-14">
      <Header displayName={profile.displayName} verified={profile.verified} onLogout={profile.handleLogout} />

      <AvatarSection
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        verified={profile.verified}
        bio={profile.bio} // ✅ bio dikirim ke AvatarSection
        isOwnProfile={profile.isOwnProfile}
        isFollowing={profile.isFollowing}
        mainFollowLabel={profile.mainFollowLabel}
        showUserPlusIcon={profile.showUserPlusIcon}
        onToggleFollow={profile.handleToggleFollow}
        onSecondary={profile.handleSecondary}
      >
        <StatsSection posts={profile.posts} followersCount={profile.followersCount} followingCount={profile.followingCount} onOpenFollowers={follow.openFollowersModal} onOpenFollowing={follow.openFollowingModal} />
      </AvatarSection>

      <PostList posts={profile.posts} loading={profile.loading} isOwner={profile.isOwnProfile} />

      {showFollowModal && <FollowModal followTab={followTab} setShowFollowModal={setShowFollowModal} follow={follow} />}
    </div>
  );
}
