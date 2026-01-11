"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Mountain, Plane, PenLine, UtensilsCrossed, Camera, MessageCircle, Palette, Laptop } from "lucide-react";

interface HashtagInputProps {
  selectedHashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  maxHashtags?: number;
}

const PREDEFINED_TOPICS = [
  { slug: "pendakian", name: "Pendakian", icon: Mountain },
  { slug: "traveling", name: "Traveling", icon: Plane },
  { slug: "opini", name: "Opini", icon: PenLine },
  { slug: "kuliner", name: "Kuliner", icon: UtensilsCrossed },
  { slug: "fotografi", name: "Fotografi", icon: Camera },
  { slug: "refleksi", name: "Refleksi", icon: MessageCircle },
  { slug: "seni", name: "Seni", icon: Palette },
  { slug: "teknologi", name: "Teknologi", icon: Laptop },
];

export default function HashtagInput({
  selectedHashtags,
  onHashtagsChange,
  maxHashtags = 10,
}: HashtagInputProps) {
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState("");

  const toggleTopic = (slug: string) => {
    if (selectedHashtags.includes(slug)) {
      onHashtagsChange(selectedHashtags.filter((h) => h !== slug));
    } else {
      if (selectedHashtags.length >= maxHashtags) {
        setError(`Maksimal ${maxHashtags} hashtag`);
        setTimeout(() => setError(""), 3000);
        return;
      }
      onHashtagsChange([...selectedHashtags, slug]);
    }
  };

  const addCustomHashtag = () => {
    if (!customInput.trim()) return;

    // Normalize: remove #, lowercase, only alphanumeric + underscore
    let normalized = customInput.replace(/^#/, "").toLowerCase().trim();
    normalized = normalized.replace(/[^a-z0-9_]/g, "");

    if (!normalized) {
      setError("Hashtag tidak valid. Gunakan huruf, angka, atau underscore.");
      return;
    }

    if (normalized.length > 50) {
      setError("Hashtag terlalu panjang (max 50 karakter)");
      return;
    }

    if (selectedHashtags.includes(normalized)) {
      setError("Hashtag sudah ditambahkan");
      return;
    }

    if (selectedHashtags.length >= maxHashtags) {
      setError(`Maksimal ${maxHashtags} hashtag`);
      return;
    }

    onHashtagsChange([...selectedHashtags, normalized]);
    setCustomInput("");
    setError("");
  };

  const removeHashtag = (hashtag: string) => {
    onHashtagsChange(selectedHashtags.filter((h) => h !== hashtag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomHashtag();
    }
  };

  return (
    <div className="space-y-4">
      {/* Predefined Topics */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pilih Topik
        </label>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_TOPICS.map((topic) => {
            const Icon = topic.icon;
            return (
              <button
                key={topic.slug}
                type="button"
                onClick={() => toggleTopic(topic.slug)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5
                  ${
                    selectedHashtags.includes(topic.slug)
                      ? "bg-sky-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {topic.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Hashtag Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hashtag Tambahan (Opsional)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Contoh: gunungGede, jawaBarat"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            maxLength={50}
          />
          <button
            type="button"
            onClick={addCustomHashtag}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition"
          >
            Tambah
          </button>
        </div>
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>

      {/* Selected Hashtags Display */}
      {selectedHashtags.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Hashtag Dipilih ({selectedHashtags.length}/{maxHashtags})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedHashtags.map((hashtag) => (
              <div
                key={hashtag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm"
              >
                <span>#{hashtag}</span>
                <button
                  type="button"
                  onClick={() => removeHashtag(hashtag)}
                  className="hover:text-sky-900 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
