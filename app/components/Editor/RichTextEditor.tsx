"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/imageCompression";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

import { LinkCardExtension } from "./LinkCardExtension";

export default function RichTextEditor({ content, onChange, placeholder = "Tulis sesuatu..." }: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      ImageExtension.configure({
        inline: true,
      }),
      LinkCardExtension,
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none min-h-[300px] max-h-[calc(100vh-250px)] overflow-y-auto px-4 py-2",
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return false;

        const urlMatch = text.match(/^https?:\/\/[^\s$.?#].[^\s]*$/i);
        if (!urlMatch) return false;

        const url = urlMatch[0];

        // Check if it's an image
        if (url.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)(\?.*)?$/i)) {
          view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.image.create({ src: url })));
          return true;
        }

        // Fetch metadata for regular links
        fetch(`/api/link-metadata?url=${encodeURIComponent(url)}`)
          .then(res => res.json())
          .then(data => {
            if (data && !data.error && view.state.schema.nodes.linkCard) {
              const pos = view.state.selection.$from.pos;
              // If the current line is empty, replace it. Otherwise insert after.
              const { from, to } = view.state.selection;
              const tr = view.state.tr.insert(pos, view.state.schema.nodes.linkCard.create({
                url: data.url,
                title: data.title,
                description: data.description,
                image: data.image,
                siteName: data.siteName
              }));
              view.dispatch(tr);
            } else {
               // Fallback to standard link insertion if metadata fails
               view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.text(url, [view.state.schema.marks.link.create({ href: url })])));
            }
          })
          .catch(() => {
             view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.text(url, [view.state.schema.marks.link.create({ href: url })])));
          });

        return true; // We handled it
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  const uploadImage = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Unauthorized");

      const compressed = await compressImage(file);

      // Use compressed blob for upload, but need to check if it's Blob or File.
      // Supabase upload matches File | Blob.
      // We'll rename it to match unique pattern.

      const extensionMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const ext = extensionMap[compressed.type] || "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("post-images").upload(filePath, compressed);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("post-images").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Gagal mengupload gambar.");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const addImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = await uploadImage(file);
        if (url && editor) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    input.click();
  }, [editor, uploadImage]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
      <Toolbar editor={editor} onAddImage={addImage} isUploading={isUploading} />
      <EditorContent editor={editor} />
    </div>
  );
}

const Toolbar = ({ editor, onAddImage, isUploading }: { editor: Editor; onAddImage: () => void; isUploading: boolean }) => {
  if (!editor) return null;

  const buttons = [
    {
      icon: Bold,
      title: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
    },
    {
      icon: Italic,
      title: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
    },
    {
      icon: UnderlineIcon,
      title: "Underline",
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive("underline"),
    },
    {
      icon: Strikethrough,
      title: "Strike",
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive("strike"),
    },
    {
      icon: Heading1,
      title: "H1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
    },
    {
      icon: Heading2,
      title: "H2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: List,
      title: "Bullet List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      icon: ListOrdered,
      title: "Ordered List",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
    {
      icon: Quote,
      title: "Blockquote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive("blockquote"),
    },
  ];

  const alignButtons = [
    {
      icon: AlignLeft,
      title: "Align Left",
      action: () => editor.chain().focus().setTextAlign("left").run(),
      isActive: editor.isActive({ textAlign: "left" }),
    },
    {
      icon: AlignCenter,
      title: "Align Center",
      action: () => editor.chain().focus().setTextAlign("center").run(),
      isActive: editor.isActive({ textAlign: "center" }),
    },
    {
      icon: AlignRight,
      title: "Align Right",
      action: () => editor.chain().focus().setTextAlign("right").run(),
      isActive: editor.isActive({ textAlign: "right" }),
    },
    {
      icon: AlignJustify,
      title: "Justify",
      action: () => editor.chain().focus().setTextAlign("justify").run(),
      isActive: editor.isActive({ textAlign: "justify" }),
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
      {buttons.map((btn, idx) => (
        <button
          key={idx}
          onClick={(e) => {
            e.preventDefault(); // Prevent form submission
            btn.action();
          }}
          className={`p-2 rounded hover:bg-gray-200 transition ${btn.isActive ? "bg-gray-200 text-black" : "text-gray-600"}`}
          title={btn.title}
          type="button"
        >
          <btn.icon size={18} />
        </button>
      ))}
      <div className="w-[1px] bg-gray-300 mx-1" />
      {alignButtons.map((btn, idx) => (
        <button
          key={`align-${idx}`}
          onClick={(e) => {
            e.preventDefault(); // Prevent form submission
            btn.action();
          }}
          className={`p-2 rounded hover:bg-gray-200 transition ${btn.isActive ? "bg-gray-200 text-black" : "text-gray-600"}`}
          title={btn.title}
          type="button"
        >
          <btn.icon size={18} />
        </button>
      ))}
      <div className="w-[1px] bg-gray-300 mx-1" />
      <button
        onClick={(e) => {
          e.preventDefault();
          onAddImage();
        }}
        className="p-2 rounded hover:bg-gray-200 transition text-gray-600"
        title="Insert Image"
        disabled={isUploading}
        type="button"
      >
        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
      </button>
    </div>
  );
};
