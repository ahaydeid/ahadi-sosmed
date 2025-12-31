import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import React from "react";

interface LinkCardAttrs {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
}

const LinkCardView = (props: NodeViewProps) => {
  const { url, title, description, image, siteName } = props.node.attrs as LinkCardAttrs;

  return (
    <NodeViewWrapper className="link-card-wrapper my-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col md:flex-row border border-gray-200 rounded-lg overflow-hidden bg-white hover:bg-gray-50 transition-colors no-underline group"
        onClick={(e) => {
          if (props.editor.isEditable) {
            // Optional: allow editing/removing the card
          }
        }}
      >
        {image && (
          <div className="w-full md:w-48 h-32 md:h-auto shrink-0 bg-gray-100 overflow-hidden">
            <img 
              src={image} 
              alt={title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          </div>
        )}
        <div className="p-4 flex flex-col justify-center min-w-0 flex-1">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 truncate">
            {siteName || new URL(url).hostname}
          </div>
          <div className="text-base font-bold text-gray-900 mb-1 truncate md:whitespace-normal line-clamp-2">
            {title}
          </div>
          {description && (
            <div className="text-sm text-gray-600 line-clamp-2">
              {description}
            </div>
          )}
        </div>
      </a>
    </NodeViewWrapper>
  );
};

export default LinkCardView;
