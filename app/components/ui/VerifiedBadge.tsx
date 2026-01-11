import React from "react";

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

export default function VerifiedBadge({
  className = "w-4 h-4",
  size,
}: VerifiedBadgeProps) {
  const style = size ? { width: size, height: size } : {};

  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0`}
      style={style}
      aria-label="Verified"
    >
      {/* Blue Badge */}
      <path
        fill="#1D9BF0"
        d="M12 2.5
           L14.3 3.9
           L17 3.6
           L18.4 6
           L20.9 7.3
           L20.6 10
           L22 12
           L20.6 14
           L20.9 16.7
           L18.4 18
           L17 20.4
           L14.3 20.1
           L12 21.5
           L9.7 20.1
           L7 20.4
           L5.6 18
           L3.1 16.7
           L3.4 14
           L2 12
           L3.4 10
           L3.1 7.3
           L5.6 6
           L7 3.6
           L9.7 3.9
           Z"
      />

      {/* Check */}
      <path
        d="M8.6 12.4l2.2 2.2 4.8-5"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
