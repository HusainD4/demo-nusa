import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { places } from "../../../services/alamService.js";
import FallbackCover from "../FallbackCover.jsx";
import PhotoCredit from "../PhotoCredit.jsx";
import Icon from "../Icon.jsx";

function DestinationPhotoGallery({ place }) {
  const [previewIndex, setPreviewIndex] = useState(null);
  const photos = useMemo(() => {
    const uniquePhotos = new Map();
    for (const item of places) {
      if (item.image && item.imageCredit?.sourcePage && !uniquePhotos.has(item.image)) {
        uniquePhotos.set(item.image, {
          src: item.imageFull,
          fallbackSrc: item.image,
          name: item.imageCredit.name || item.name,
          attribution: item.imageCredit,
        });
      }
    }

    return [...uniquePhotos.values()].sort((first, second) => (
      first.src === place.imageFull ? -1 : second.src === place.imageFull ? 1 : 0
    ));
  }, [place.image, place.imageFull]);

  useEffect(() => {
    if (previewIndex === null) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event) {
      if (event.key === "Escape") setPreviewIndex(null);
      if (event.key === "ArrowRight") setPreviewIndex((index) => (index + 1) % photos.length);
      if (event.key === "ArrowLeft") setPreviewIndex((index) => (index - 1 + photos.length) % photos.length);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [photos.length, previewIndex]);

  if (!photos.length) return null;

  const activePhoto = previewIndex === null ? null : photos[previewIndex];

  return (
    <section className="page-width destination-photo-gallery reveal" aria-labelledby="destination-gallery-title">
      <div className="destination-gallery-heading">
        <div>
          <span className="eyebrow">ARSIP VISUAL NUSA</span>
          <h2 id="destination-gallery-title">Pemandangan Nusantara.</h2>
          <p>Foto berlisensi dari berbagai bentang alam Indonesia. Pilih foto untuk pratinjau.</p>
        </div>
        <span className="destination-gallery-count">{photos.length} foto beratribusi</span>
      </div>
      <div className="destination-gallery-grid">
        {photos.map((photo, index) => (
          <button
            className="destination-gallery-photo"
            key={photo.src}
            type="button"
            aria-label={`Pratinjau foto ${photo.name}`}
            onClick={() => setPreviewIndex(index)}
          >
            <FallbackCover
              src={photo.src}
              fallbackSrc={photo.fallbackSrc}
              alt={`Panorama ${photo.name}`}
            />
            <span className="destination-gallery-photo-overlay">
              <strong>{photo.name}</strong>
              <span>Lihat foto <Icon name="arrow-up-right" /></span>
            </span>
          </button>
        ))}
      </div>

      {activePhoto && createPortal(
        <div className="photo-preview-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPreviewIndex(null);
        }}>
          <section className="photo-preview-dialog" role="dialog" aria-modal="true" aria-label={`Pratinjau foto ${activePhoto.name}`}>
            <button className="photo-preview-close" type="button" aria-label="Tutup pratinjau" onClick={() => setPreviewIndex(null)}>×</button>
            <div className="photo-preview-stage" style={{ "--preview-image": `url("${activePhoto.src}")` }}>
              <FallbackCover
                src={activePhoto.src}
                fallbackSrc={activePhoto.fallbackSrc}
                className="photo-preview-image"
                alt={`Panorama ${activePhoto.name}`}
              />
              <span className="photo-preview-stage-label">ARSIP VISUAL NUSA</span>
            </div>
            <div className="photo-preview-caption">
              <div>
                <span className="eyebrow eyebrow-light">{String(previewIndex + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
                <h3>{activePhoto.name}</h3>
                <PhotoCredit attribution={activePhoto.attribution} />
              </div>
              <div className="photo-preview-controls">
                <button type="button" aria-label="Foto sebelumnya" onClick={() => setPreviewIndex((index) => (index - 1 + photos.length) % photos.length)}><Icon name="chevron-left" /></button>
                <button type="button" aria-label="Foto berikutnya" onClick={() => setPreviewIndex((index) => (index + 1) % photos.length)}><Icon name="chevron-right" /></button>
              </div>
            </div>
          </section>
        </div>,
        document.body,
      )}
      <span className="visually-hidden">Galeri dibuka dari halaman {place.name}.</span>
    </section>
  );
}

export default DestinationPhotoGallery;
