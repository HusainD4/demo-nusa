const statusContent = {
  403: {
    eyebrow: "AKSES TERBATAS",
    title: "Jalur ini belum terbuka.",
    description: "Anda tidak memiliki izin untuk mengakses halaman ini. Kembali ke beranda atau lanjutkan menjelajahi alam Nusantara.",
    detail: "403 · Akses ditolak",
  },
  404: {
    eyebrow: "JEJAK TAK DITEMUKAN",
    title: "Halaman ini tidak ada di peta.",
    description: "Tautan mungkin sudah berubah atau alamat yang Anda masukkan keliru. Mari kembali menemukan jalur yang tepat.",
    detail: "404 · Halaman tidak ditemukan",
  },
  505: {
    eyebrow: "GANGGUAN PROTOKOL",
    title: "Jalur komunikasi belum cocok.",
    description: "Server tidak mendukung versi protokol HTTP yang digunakan. Coba muat ulang nanti atau kembali ke beranda.",
    detail: "505 · Versi HTTP tidak didukung",
  },
};

export default function StatusPage({ code, onNavigate }) {
  const content = statusContent[code] ?? statusContent[404];

  return (
    <section className="status-page inner-page" aria-labelledby="status-title">
      <div className="status-page-content page-width">
        <span className="status-page-orbit status-page-orbit-one" aria-hidden="true" />
        <span className="status-page-orbit status-page-orbit-two" aria-hidden="true" />
        <div className="status-page-copy">
          <span className="eyebrow">{content.eyebrow}</span>
          <span className="status-page-code" aria-label={`Kode ${code}`}>{code}</span>
          <h1 id="status-title">{content.title}</h1>
          <p>{content.description}</p>
          <span className="status-page-detail">{content.detail}</span>
          <div className="status-page-actions">
            <button className="button button-lime" type="button" onClick={() => onNavigate("/")}>
              Kembali ke beranda
            </button>
            <button className="button status-page-secondary" type="button" onClick={() => onNavigate("/jelajah")}>
              Jelajahi destinasi
            </button>
          </div>
        </div>
        <div className="status-page-art" aria-hidden="true">
          <svg viewBox="0 0 480 360" fill="none">
            <path d="M22 309 139 142l56 79 74-112 189 200H22Z" fill="currentColor" fillOpacity=".08" />
            <path d="m22 309 117-167 56 79 74-112 189 200" stroke="currentColor" strokeOpacity=".44" strokeWidth="1.5" />
            <path d="m104 309 91-88 42 46 32-35 93 77" stroke="currentColor" strokeOpacity=".26" />
            <circle cx="335" cy="94" r="37" stroke="currentColor" strokeOpacity=".35" />
            <circle cx="335" cy="94" r="55" stroke="currentColor" strokeOpacity=".16" />
            <path d="M335 29v15m0 100v15m65-65h-15m-100 0h-15m111-46-11 11m-71 71-11 11m92 0-11-11m-71-71-11-11" stroke="currentColor" strokeOpacity=".36" strokeLinecap="round" />
            <path d="M22 309h436" stroke="currentColor" strokeOpacity=".28" />
          </svg>
          <span>NUSA · PUNCAK CERITA NUSANTARA</span>
        </div>
      </div>
    </section>
  );
}
