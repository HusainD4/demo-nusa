import { useEffect, useState } from "react";

function FallbackCover({ src, fallbackSrc, alt, className = "" }) {
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [src, fallbackSrc]);

  const imageSrc = attempt === 1 ? fallbackSrc : src;
  return attempt > 1 || !imageSrc ? (
    <span className={`fallback-cover${className ? ` ${className}` : ""}`} role="img" aria-label={alt}>
      <span aria-hidden="true">△</span>
    </span>
  ) : (
    <img
      className={className}
      src={imageSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setAttempt((current) => current + 1)}
    />
  );
}

export default FallbackCover;