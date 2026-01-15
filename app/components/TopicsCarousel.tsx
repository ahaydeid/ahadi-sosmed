"use client";

import Link from "next/link";
import { TrendingUp, Mountain, Plane, PenLine, UtensilsCrossed, Camera, MessageCircle, Palette, Laptop } from "lucide-react";

interface Topic {
  name: string;
  slug: string;
  icon: any;
  count?: number;
}

const POPULAR_TOPICS: Topic[] = [
  { name: "Pendakian", slug: "pendakian", icon: Mountain },
  { name: "Traveling", slug: "traveling", icon: Plane },
  { name: "Opini", slug: "opini", icon: PenLine },
  { name: "Kuliner", slug: "kuliner", icon: UtensilsCrossed },
  { name: "Fotografi", slug: "fotografi", icon: Camera },
  { name: "Refleksi", slug: "refleksi", icon: MessageCircle },
  { name: "Seni", slug: "seni", icon: Palette },
  { name: "Teknologi", slug: "teknologi", icon: Laptop },
];

export default function TopicsCarousel() {
  return (
    <section className="bg-white px-4 py-4 border-b border-gray-100">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg font-bold text-gray-900">Explore Topics</h2>
      </div>

      {/* Topics Grid - 2 Rows */}
      <div className="flex flex-wrap gap-2">
        {POPULAR_TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <Link
              key={topic.slug}
              href={`/topic/${topic.slug}`}
              className="flex-shrink-0"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-sky-500 transition-all">
                <Icon className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-xs font-medium text-gray-900">{topic.name}</span>
                {topic.count && (
                  <span className="text-[10px] text-gray-500">({topic.count})</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
