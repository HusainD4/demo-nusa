import alamData from "../data/alam_indonesia.json";
import peakImageCredits from "../data/peak-image-credits.json";
import { parseCoordinatePair } from "../utils/coordinateParser.js";

const regionGroups = [
  { match: /sumatra/i, label: "Sumatra", id: "sumatra" },
  { match: /sunda|jawa/i, label: "Jawa", id: "jawa" },
  { match: /kalimantan/i, label: "Kalimantan", id: "kalimantan" },
  { match: /sulawesi|sangihe/i, label: "Sulawesi", id: "sulawesi" },
  { match: /bali|nusa tenggara/i, label: "Bali & Nusa Tenggara", id: "bali-nt" },
  { match: /maluku/i, label: "Maluku", id: "maluku" },
  { match: /papua/i, label: "Papua", id: "papua" },
];

function getRegion(region) {
  return regionGroups.find((group) => group.match.test(region)) ?? {
    label: region,
    id: region.toLocaleLowerCase("id").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  };
}

function formatCoordinates(peak) {
  if (peak.coordinates_dms) return peak.coordinates_dms;
  const coordinates = parseCoordinatePair(peak.latitude, peak.longitude);
  if (!coordinates) return "Koordinat belum tersedia";
  const [latitudeValue, longitudeValue] = coordinates;
  const latitude = `${Math.abs(latitudeValue).toFixed(4)}° ${latitudeValue < 0 ? "S" : "N"}`;
  const longitude = `${Math.abs(longitudeValue).toFixed(4)}° ${longitudeValue < 0 ? "W" : "E"}`;
  return `${latitude}, ${longitude}`;
}

function describePeak(peak) {
  const region = getRegion(peak.region).label;
  const height = Number.isFinite(peak.elevation_m)
    ? `${peak.elevation_m.toLocaleString("id-ID")} meter`
    : "ketinggian belum tersedia";
  return `${peak.name} berada di wilayah ${peak.province}, ${region}, dengan catatan ${peak.type.toLocaleLowerCase("id")} dan ${height}.`;
}

function describePeakInParagraphs(peak, regionLabel, coordinates) {
  const elevation = Number.isFinite(peak.elevation_m)
    ? `Ketinggiannya tercatat sekitar ${peak.elevation_m.toLocaleString("id-ID")} meter di atas permukaan laut.`
    : "Data ketinggiannya belum tersedia pada dataset.";
  const classification = peak.type
    ? `Dalam dataset, bentang alam ini diklasifikasikan sebagai ${peak.type.toLocaleLowerCase("id")}.`
    : "";
  const facts = [classification, elevation].filter(Boolean).join(" ");

  return [
    `Terletak di Provinsi ${peak.province}, kawasan ${regionLabel}. ${facts}`,
    `Lokasinya dicatat pada koordinat ${coordinates} dengan datum WGS84. Informasi ini bersumber dari data geospasial dan bukan pembaruan kondisi lapangan; verifikasi akses, cuaca, serta status kawasan melalui pengelola dan sumber resmi sebelum berkunjung.`,
  ];
}

const photoAttributions = new Map(
  peakImageCredits.map((attribution) => [attribution.localPath, attribution]),
);

function normalizePlaceName(name) {
  return name
    .toLocaleLowerCase("id")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function splitDescription(description) {
  const sentences = description
    .split(/(?<=[.!?])\s+(?=[A-Z"'“])/u)
    .filter(Boolean);
  if (sentences.length < 2) return [description];

  const paragraphBreak = Math.ceil(sentences.length / 2);
  return [
    sentences.slice(0, paragraphBreak).join(" "),
    sentences.slice(paragraphBreak).join(" "),
  ];
}

export async function getPlaceNaturalHistory(name) {
  const { default: attributions } = await import("../data/peak-image-attributions.json");
  const attribution = attributions.find(
    (item) => normalizePlaceName(item.name) === normalizePlaceName(name),
  );
  return attribution
    ? { ...attribution, descriptionParagraphs: splitDescription(attribution.description) }
    : null;
}

const highResolutionPhotoSourceIds = new Set([
  2, 5, 8, 9, 10, 16, 18, 19, 22, 25, 31,
  53, 61, 67, 69, 107, 110, 114, 115, 118, 121, 255,
]);

export const places = alamData.peaks.map((peak) => {
  const region = getRegion(peak.region);
  const kind = /bukit/i.test(peak.type) || /bukit/i.test(peak.name) ? "bukit" : "gunung";
  const coordinates = formatCoordinates(peak);
  const imageCredit = photoAttributions.get(peak.image) ?? null;
  const imageFull = imageCredit && highResolutionPhotoSourceIds.has(imageCredit.sourceId)
    ? `/images/peaks/peak-${imageCredit.sourceId}.jpg`
    : peak.image;

  return {
    id: String(peak.id),
    sourceId: peak.id,
    name: peak.name,
    kind,
    region: region.id,
    regionLabel: region.label,
    location: peak.province,
    province: peak.province,
    elevation: Number.isFinite(peak.elevation_m) ? peak.elevation_m : null,
    coordinates,
    latitude: peak.latitude,
    longitude: peak.longitude,
    status: "Belum diverifikasi",
    type: peak.type,
    image: peak.image,
    imageFull,
    imageCredit,
    summary: describePeak(peak),
    descriptionParagraphs: describePeakInParagraphs(peak, region.label, coordinates),
    ecology: `Bentang alam ini berada di wilayah ${region.label}. Dataset geospasial belum memuat uraian habitat yang terverifikasi; lengkapi melalui kajian ilmiah dan pengelola kawasan setempat.`,
    history: `Dataset geospasial dasar hanya mencatat nama, wilayah, koordinat, jenis, dan ketinggian ${peak.name}; catatan sejarah khusus belum tersedia. Kronologi geologi atau sejarah masyarakat perlu ditelusuri melalui PVMBG, pengelola kawasan, arsip daerah, dan sumber lokal.`,
    visit: "Periksa pengumuman pemerintah daerah, pengelola kawasan, dan PVMBG bila relevan. Informasi dalam atlas ini bukan panduan keselamatan waktu nyata.",
    species: "Dataset geospasial dasar belum mencantumkan spesies flora atau fauna. Jangan menganggap spesies tertentu hadir tanpa dukungan survei atau sumber konservasi.",
    sourceRegion: peak.region,
    coordinatesDms: peak.coordinates_dms,
  };
});

export const alamMetadata = alamData.metadata;

export function getPlaceById(id) {
  return places.find((place) => place.id === String(id));
}

export function getFeaturedPlaces() {
  const preferredIds = ["143", "22", "118"];
  const preferred = preferredIds.map(getPlaceById).filter(Boolean);
  const chosen = new Set(preferred.map((place) => place.id));
  for (const place of [...places].sort((a, b) => (b.elevation ?? 0) - (a.elevation ?? 0))) {
    if (preferred.length >= 3) break;
    if (!chosen.has(place.id)) {
      preferred.push(place);
      chosen.add(place.id);
    }
  }
  return preferred.slice(0, 3);
}