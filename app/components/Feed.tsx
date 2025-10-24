"use client";

import TopBar from "./TopBar";
import PostCard from "./PostCard";

export default function Feed() {
  // Nanti bisa diganti fetch dari Supabase
  const posts = [
    {
      id: 1,
      author: "Ahadi Hadi",
      title: "Lorem Ipsum is simply dummy text of the printing and typesetting industry",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
      date: "2 hari lalu",
      views: 167,
      likes: 76,
      comments: 30,
    },
    {
      id: 2,
      author: "Zahrotuttoyyibah",
      title: "Another sample post for demonstration purposes in the feed section",
      description: "This is another placeholder post to show how multiple cards would look in a feed layout.",
      date: "4 hari lalu",
      views: 240,
      likes: 54,
      comments: 12,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky top bar */}
      <TopBar />

      {/* Konten utama */}
      <div className="space-y-1">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
