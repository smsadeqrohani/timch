import React from 'react';

interface ImageHoverPreviewProps {
  imageUrl?: string | null;
  children: React.ReactNode;
  alt?: string;
  containerClassName?: string;
}

export default function ImageHoverPreview({
  imageUrl,
  children,
  alt,
  containerClassName = '',
}: ImageHoverPreviewProps) {
  return (
    <div className={`relative group inline-block ${containerClassName}`}>
      {children}
      {imageUrl ? (
        <div className="pointer-events-none absolute left-1/2 top-0 z-40 hidden -translate-x-1/2 -translate-y-full transform pb-3 group-hover:block">
          <div className="h-60 w-80 overflow-hidden rounded-lg border border-white/20 bg-gray-900/90 shadow-xl backdrop-blur-sm">
            <img
              src={imageUrl}
              alt={alt ?? ''}
              className="h-full w-full object-contain p-2"
              loading="lazy"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

