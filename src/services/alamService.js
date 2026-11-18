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

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'“])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getTypeLearningNote(type, elevation, name) {
  const normalizedType = (type ?? "").toLocaleLowerCase("id");
  if (/\bribu\b/.test(normalizedType)) {
    return `Label “Ribu” mengelompokkan puncak berketinggian lebih dari 1.000 meter dalam daftar sumber katalog, bukan menjelaskan jenis batuan atau proses pembentukannya. Dengan elevasi ${elevation}, ${name} termasuk kelompok tersebut${normalizedType.includes("ultra") ? " dan juga diberi label Ultra oleh sumber katalog" : ""}.`;
  }
  if (/stratovolcano|stratovolkano/.test(normalizedType)) {
    return "Stratovolkano terbentuk dari timbunan berulang material letusan, seperti lava dan fragmen vulkanik, yang dapat membangun tubuh gunung berlereng. Istilah ini menjelaskan bentuk dan asal geologi, bukan status aktivitasnya saat ini.";
  }
  if (/complex volcano|kompleks vulkan/.test(normalizedType)) {
    return "Istilah kompleks vulkanik menunjukkan bahwa bentang alamnya melibatkan lebih dari satu pusat atau struktur vulkanik. Label ini sendiri tidak menentukan kapan letusan terakhir terjadi atau apakah suatu jalur aman.";
  }
  if (/caldera|kaldera/.test(normalizedType)) {
    return "Kaldera adalah cekungan vulkanik luas yang dapat terbentuk ketika bagian puncak runtuh setelah perubahan besar pada sistem magma. Bentuk kaldera tidak dengan sendirinya menunjukkan bahwa gunung sedang aktif.";
  }
  if (/fumarole/.test(normalizedType)) {
    return "Fumarola adalah rekahan atau lubang tempat gas dan uap panas keluar dari sistem panas bumi. Kehadirannya merupakan gejala geologi yang perlu diamati dari jarak aman dan tidak otomatis menandakan tingkat aktivitas tertentu.";
  }
  if (/non-vulkanik/.test(normalizedType)) {
    return "Label non-vulkanik membedakan bentang alam ini dari bentuk yang dibangun oleh aktivitas gunung api. Bentuknya tetap dapat dipengaruhi pengangkatan kerak, pelipatan, patahan, pelapukan, dan erosi.";
  }
  if (/submarine volcano/.test(normalizedType)) {
    return "Gunung api bawah laut terbentuk di dasar laut dan dipelajari melalui pemetaan batimetri serta pengamatan geologi kelautan. Koordinat puncak pada katalog tidak menjelaskan kedalaman atau kondisi aktivitasnya.";
  }
  if (/shield volcano/.test(normalizedType)) {
    return "Gunung api perisai umumnya memiliki tubuh luas dengan lereng relatif landai yang terbentuk dari aliran lava. Klasifikasi bentuk ini tidak cukup untuk menyimpulkan aktivitas atau risiko saat ini.";
  }
  if (/kerucut piroklastik/.test(normalizedType)) {
    return "Kerucut piroklastik terbentuk dari material letusan yang menumpuk di sekitar pusat erupsi. Ukuran dan bentuk kerucut tidak dapat dipakai sendirian untuk menentukan aktivitas gunung api.";
  }
  if (/bukit|puncak|ribu|ultra|spesial|titik tertinggi/.test(normalizedType)) {
    return "Label dalam katalog dapat menunjukkan kategori ketinggian atau arti relatif suatu puncak, bukan kelas batuan. Untuk mengenali proses pembentukannya diperlukan peta geologi dan kajian lapangan.";
  }
  return `Katalog menyebut jenisnya sebagai “${type || "belum diklasifikasikan"}”. Istilah tersebut adalah petunjuk awal untuk belajar, sedangkan kepastian bentuk lahan dan proses geologinya memerlukan peta geologi atau penelitian setempat.`;
}

function getRegionalLearningNote(regionLabel) {
  const notes = {
    Sumatra: "Di Sumatra, Pegunungan Bukit Barisan membentuk tulang punggung geografis pulau dan mencakup beragam bentang alam vulkanik maupun non-vulkanik. Nama wilayah Sumatra saja tidak cukup untuk menyatakan bahwa setiap puncak berada tepat di jalur Bukit Barisan.",
    Jawa: "Pulau Jawa memiliki jalur gunung api yang menonjol di bagian selatan, tetapi dataset juga memuat bukit dan bentuk lahan lain. Posisi provinsi membantu mempersempit konteks, sedangkan peta geologi diperlukan untuk memahami satu gunung secara tepat.",
    Kalimantan: "Kalimantan dikenal dengan dataran tinggi dan rangkaian pegunungan yang sejarah geologinya berbeda dari busur gunung api Jawa. Sebutan Kalimantan memberi konteks pulau, tetapi tidak mengungkap sendiri batuan atau umur Gunung Tutoop.",
    Sulawesi: "Sulawesi memiliki bentuk pulau yang rumit dan sejarah tektonik yang beragam. Karena itu, puncak-puncaknya tidak sebaiknya dianggap memiliki asal geologi yang sama hanya karena berada di pulau yang sama.",
    "Bali & Nusa Tenggara": "Bali dan Nusa Tenggara mencakup rangkaian pulau dengan banyak bentang alam vulkanik dan non-vulkanik. Kondisi setiap gunung berbeda, sehingga label kawasan tidak menggantikan pemeriksaan peta serta informasi setempat.",
    Maluku: "Kepulauan Maluku berada pada kawasan tektonik yang kompleks dengan pulau-pulau dan busur vulkanik yang beragam. Konteks kepulauan membantu memahami skala wilayah, tetapi asal geologi tiap puncak tetap perlu diperiksa secara khusus.",
    Papua: "Papua memiliki dataran tinggi dan rangkaian pegunungan besar di bagian tengah pulau. Tidak semua entri Papua berada pada punggungan yang sama, sehingga koordinat dan peta topografi penting untuk membaca letak masing-masing.",
  };
  return notes[regionLabel]
    ?? `${regionLabel} adalah konteks regional untuk menempatkan destinasi pada peta Indonesia. Bentuk muka bumi dalam wilayah tersebut tetap beragam dan perlu dipelajari berdasarkan lokasi serta sumber geologi yang lebih rinci.`;
}

function calculateDistanceKm(first, second) {
  const radians = Math.PI / 180;
  const latitudeDifference = (second.latitude - first.latitude) * radians;
  const longitudeDifference = (second.longitude - first.longitude) * radians;
  const firstLatitude = first.latitude * radians;
  const secondLatitude = second.latitude * radians;
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDifference / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getNearbyLearningSentences(peak) {
  if (!Number.isFinite(peak.latitude) || !Number.isFinite(peak.longitude)) {
    return [
      `Koordinat yang tersedia belum cukup untuk membandingkan posisi ${peak.name} dengan puncak lain secara terukur.`,
      "Jika koordinat yang lebih rinci ditemukan, jarak antartitik dapat dihitung untuk mempelajari pola sebaran bentang alam.",
    ];
  }

  const nearbyPlaces = places
    .filter((candidate) => (
      candidate.id !== String(peak.id ?? peak.sourceId)
      && Number.isFinite(candidate.latitude)
      && Number.isFinite(candidate.longitude)
    ))
    .map((candidate) => ({ place: candidate, distance: calculateDistanceKm(peak, candidate) }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 3);

  if (nearbyPlaces.length === 0) return [];

  const nearbyList = nearbyPlaces
    .map(({ place, distance }) => `${place.name} (sekitar ${Math.round(distance)} km)`)
    .join(", ");
  const sentences = [
    `Tiga entri terdekat dalam katalog berdasarkan koordinat adalah ${nearbyList}; urutannya dari yang paling dekat.`,
  ];
  const closest = nearbyPlaces[0];
  if (Number.isFinite(peak.elevation) && Number.isFinite(closest.place.elevation)) {
    const difference = Math.abs(peak.elevation - closest.place.elevation);
    const relation = peak.elevation > closest.place.elevation ? "lebih tinggi" : "lebih rendah";
    sentences.push(
      `${peak.name} tercatat ${difference.toLocaleString("id-ID")} meter ${relation} daripada ${closest.place.name}; selisih ini membandingkan elevasi puncak, bukan kedalaman lembah di antara keduanya.`,
    );
  }
  sentences.push(
    "Jarak tersebut adalah jarak geodesik antarkoordinat, bukan panjang jalan atau jalur pendakian.",
  );
  return sentences;
}

function buildDetailedDescriptionParagraphs(peak, regionLabel, coordinates, attribution = null) {
  const sourceDescription = attribution?.description ? splitSentences(attribution.description) : [];
  const elevationValue = peak.elevation_m ?? peak.elevation;
  const elevation = Number.isFinite(elevationValue)
    ? `${elevationValue.toLocaleString("id-ID")} mdpl`
    : "belum tercatat";
  const coordinatesDms = peak.coordinates_dms || peak.coordinatesDms;
  const latitude = peak.latitude;
  const longitude = peak.longitude;
  const decimalCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `${Math.abs(latitude).toFixed(4)}° ${latitude < 0 ? "S" : "N"}, ${Math.abs(longitude).toFixed(4)}° ${longitude < 0 ? "W" : "E"}`
    : coordinates;
  const sentences = [
    ...sourceDescription,
    `${peak.name} berada di Provinsi ${peak.province}, pada kelompok wilayah ${regionLabel} di Indonesia.`,
    `Pada peta, koordinatnya sekitar ${decimalCoordinates}.`,
    `${Number.isFinite(latitude) ? (latitude >= 0 ? "Lintangnya berada di utara" : "Lintangnya berada di selatan") : "Garis lintang belum tercatat"}, sedangkan bujurnya menunjukkan posisinya terhadap meridian nol.`,
    "Lintang membantu menentukan posisi utara atau selatan dari khatulistiwa, sementara bujur menunjukkan posisi timur atau barat.",
    coordinatesDms
      ? `Sumber juga menuliskan posisi itu dalam format derajat-menit-detik sebagai ${coordinatesDms}.`
      : "Koordinat derajat-menit-detik belum disediakan, sehingga angka desimal digunakan pada profil ini.",
    `Elevasi ${elevation} menyatakan tinggi titik yang dicatat terhadap permukaan laut.`,
    "Elevasi adalah ketinggian sebuah titik, bukan ukuran seberapa menonjol gunung dibandingkan lembah di sekelilingnya.",
    "Dua gunung dengan elevasi mirip dapat memiliki bentuk lereng, relief lokal, dan tingkat kesulitan medan yang sangat berbeda.",
    "Ketinggian saja juga tidak cukup untuk menyimpulkan suhu, tutupan hutan, cuaca, ataupun kondisi jalur.",
    `Jenis yang dicatat untuk bentang alam ini adalah “${peak.type || "belum diklasifikasikan"}”.`,
    getTypeLearningNote(peak.type, elevation, peak.name),
    `Untuk memahami konteks wilayah, ${getRegionalLearningNote(regionLabel)}`,
    "Pada skala Indonesia, pertemuan dan pergerakan lempeng tektonik membantu membentuk busur gunung api, pegunungan, patahan, serta cekungan.",
    "Pengaruh tektonik Indonesia tidak seragam; penjelasan tentang satu puncak perlu disesuaikan dengan peta geologi setempat.",
    "Perbandingan dengan destinasi lain membantu memperhatikan sebaran relief di sekitarnya.",
    ...getNearbyLearningSentences(peak),
    `Untuk mempelajari ${peak.name} lebih lanjut, cocokkan posisi ini dengan peta topografi dan lihat garis kontur di sekitar puncak.`,
    "Garis kontur yang berdekatan pada peta biasanya menandakan perubahan elevasi yang lebih cepat daripada garis kontur yang renggang.",
    "Pola punggungan dan lembah pada peta dapat membantu menjelaskan arah aliran air, tetapi tidak menggantikan pengamatan hidrologi.",
    "Batuan, bentuk lereng, dan endapan di lapangan dapat menjadi petunjuk proses geologi yang berlangsung selama waktu panjang.",
    "Satu foto hanya memperlihatkan sudut pandang dan musim tertentu, bukan keseluruhan bentang alam atau kondisi tahunannya.",
    "Nama tempat dapat menyimpan pengetahuan bahasa dan sejarah masyarakat, tetapi maknanya perlu dipastikan melalui sumber lokal.",
    "Informasi tentang tumbuhan dan satwa sebaiknya dibandingkan dengan catatan taman, survei ilmiah, atau sumber konservasi daerah.",
    "Untuk belajar tentang sejarah erupsi dan aktivitas gunung api, periksa arsip PVMBG atau MAGMA Indonesia jika klasifikasi vulkanik berlaku.",
    "Peta geologi Badan Geologi dan peta rupabumi BIG dapat membantu memeriksa bentuk lahan serta nama geografis.",
    "Sumber katalog ini memadukan data geospasial dan daftar puncak; setiap sumber dapat memakai tujuan klasifikasi yang berbeda.",
    "Informasi rute, izin, cuaca, dan keselamatan harus diperoleh dari pengelola kawasan karena data profil bukan pembaruan lapangan.",
  ];

  const uniqueSentences = [...new Set(sentences)];
  while (uniqueSentences.length < 25) {
    uniqueSentences.push(
      `Keterangan tambahan tentang ${peak.name} sebaiknya dipelajari dengan membandingkan peta, sumber ilmiah, dan pengetahuan masyarakat setempat.`,
    );
  }

  const paragraphSize = 5;
  const paragraphs = [];
  for (let index = 0; index < uniqueSentences.length; index += paragraphSize) {
    paragraphs.push(uniqueSentences.slice(index, index + paragraphSize).join(" "));
  }
  return paragraphs;
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

export async function getPlaceNaturalHistory(place) {
  const { default: attributions } = await import("../data/peak-image-attributions.json");
  const attribution = attributions.find(
    (item) => normalizePlaceName(item.name) === normalizePlaceName(place.name),
  );
  return {
    ...(attribution ?? {}),
    detailedDescriptionParagraphs: buildDetailedDescriptionParagraphs(
      place,
      place.regionLabel,
      place.coordinates,
      attribution,
    ),
  };
}

export function getPlaceDetailedDescription(place) {
  return buildDetailedDescriptionParagraphs(
    place,
    place.regionLabel,
    place.coordinates,
  );
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