import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
// @ts-ignore
import LinkCardView from "./LinkCardView";

export interface LinkCardOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    linkCard: {
      setLinkCard: (options: { url: string; title: string; description: string; image: string; siteName: string }) => ReturnType;
    };
  }
}

export const LinkCardExtension = Node.create<LinkCardOptions>({
  name: "linkCard",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      url: { default: null },
      title: { default: null },
      description: { default: null },
      image: { default: null },
      siteName: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="link-card"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "link-card" })];
  },

  addCommands() {
    return {
      setLinkCard:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkCardView);
  },
});
