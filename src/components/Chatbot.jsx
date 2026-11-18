import { useEffect, useRef, useState } from "react";
import responses from "../data/chatbot_responses.json";
import { places } from "../services/alamService.js";
import Icon from "./ui/Icon.jsx";

function ChatIcon({ close = false }) {
  return close ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.5-3.1A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8.5 11.5h.01m4 0h.01m4 0h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const ignoredWords = new Set([
  "ada", "apa", "atau", "bagaimana", "bagi", "buat", "dan", "dari", "di", "dong", "dengan",
  "info", "informasi", "ini", "itu", "ke", "mana", "mengenai", "menurut", "oleh", "pada",
  "saya", "seputar", "tentang", "untuk", "yang", "the", "what", "where", "with", "about",
  "tell", "me", "please", "is", "are", "the",
]);

function normalizeText(value) {
  return value
    .toLocaleLowerCase("id")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const geographicWords = new Set(
  places.flatMap((place) => [place.regionLabel, place.location])
    .flatMap((location) => normalizeText(location).split(" ")),
);
const genericPlaceWords = new Set(["bukit", "gunung", "puncak", "volcano", "mount"]);
const placeQuestionWords = new Set([
  ...ignoredWords,
  ...geographicWords,
  ...genericPlaceWords,
  "akses", "berapa", "daftar", "dimana", "elevasi", "ketinggian", "koordinat", "lokasi",
  "mdpl", "paling", "rekomendasi", "rendah", "sebutkan", "terendah", "tertinggi", "tinggi",
]);

function editSimilarity(left, right) {
  if (left === right) return 1;
  if (Math.min(left.length, right.length) < 4) return 0;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

function getWordVariants(word) {
  const variants = new Set([word]);
  const roots = [word];
  const suffixPattern = /(kan|nya|lah|kah|an|i)$/;
  const prefixPattern = /^(meng|meny|men|mem|me|peng|pen|pem|per|ber|ter|di|ke|se|pe)/;

  for (const root of roots) {
    const withoutSuffix = root.replace(suffixPattern, "");
    if (withoutSuffix.length >= 3 && withoutSuffix !== root) {
      variants.add(withoutSuffix);
      roots.push(withoutSuffix);
    }

    const withoutPrefix = root.replace(prefixPattern, "");
    if (withoutPrefix.length >= 3 && withoutPrefix !== root) {
      variants.add(withoutPrefix);
      roots.push(withoutPrefix);
    }
  }

  return [...variants];
}

function wordSimilarity(left, right) {
  return Math.max(
    ...getWordVariants(left).flatMap((leftVariant) =>
      getWordVariants(right).map((rightVariant) => editSimilarity(leftVariant, rightVariant)),
    ),
  );
}

function keywordSimilarity(message, keyword) {
  const normalizedMessage = normalizeText(message);
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return 0;
  if (` ${normalizedMessage} `.includes(` ${normalizedKeyword} `)) {
    const wordCount = normalizedKeyword.split(" ").length;
    return wordCount > 1 ? 0.99 : Math.min(0.82, 0.55 + normalizedKeyword.length * 0.027);
  }

  const messageWords = normalizedMessage.split(" ").filter((word) => word && !ignoredWords.has(word));
  const keywordWords = normalizedKeyword.split(" ").filter((word) => !ignoredWords.has(word));
  if (messageWords.length === 0 || keywordWords.length === 0) return 0;

  const matches = keywordWords.map((keywordWord) => Math.max(
    ...messageWords.map((messageWord) => wordSimilarity(messageWord, keywordWord)),
  ));
  const matched = matches.filter((similarity) => similarity >= 0.72);
  if (matched.length === 0) return 0;

  const averageMatch = matched.reduce((total, similarity) => total + similarity, 0) / matched.length;
  const keywordCoverage = matched.length / keywordWords.length;
  const messageCoverage = matched.length / messageWords.length;
  return averageMatch * (0.65 * keywordCoverage + 0.2 * messageCoverage);
}

function getBestMatch(message, entries) {
  return entries
    .flatMap((entry) => entry.keywords.map((keyword) => ({
      entry,
      keyword,
      score: keywordSimilarity(message, keyword),
    })))
    .sort((a, b) => b.score - a.score || b.keyword.length - a.keyword.length)[0];
}

function findPlaceMatch(message) {
  const meaningfulMessage = normalizeText(message)
    .split(" ")
    .filter((word) => word && !placeQuestionWords.has(word))
    .join(" ");
  const matchingPlaces = places
    .map((place) => {
      const normalizedMessage = ` ${normalizeText(message)} `;
      const searchableName = normalizeText(place.name).replace(/^(gunung|bukit|puncak)\s+/, "");
      const nameWords = searchableName.split(" ").filter((word) => (
        word.length >= 4 && !placeQuestionWords.has(word)
      ));
      const mentionedWords = nameWords.filter((word) => normalizedMessage.includes(` ${word} `));
      const exactNameScore = normalizedMessage.includes(` ${searchableName} `)
        ? 0.99
        : mentionedWords.length > 0
          ? Math.min(0.94, 0.82 + mentionedWords.length * 0.06)
          : 0;
      return {
        place,
        score: Math.max(exactNameScore, keywordSimilarity(meaningfulMessage, searchableName)),
      };
    })
    .sort((a, b) => b.score - a.score || a.place.name.length - b.place.name.length);
  return matchingPlaces[0];
}

function choosePhrase(phrases, message) {
  const hash = [...normalizeText(message)].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  return phrases[hash % phrases.length];
}

function findRegionMatch(message) {
  const normalizedMessage = ` ${normalizeText(message)} `;
  const locations = [...new Set(places.flatMap((place) => [place.regionLabel, place.location]))]
    .sort((left, right) => right.length - left.length);
  return locations.find((location) => normalizedMessage.includes(` ${normalizeText(location)} `));
}

function resolveRegionalQuestion(message, normalizedMessage) {
  const region = findRegionMatch(message);
  const asksForCount = /\b(berapa|jumlah|banyak|total|count)\b/.test(normalizedMessage);
  const asksForRanking = /\b(tertinggi|paling tinggi|terendah|paling rendah)\b/.test(normalizedMessage);
  const asksForList = /\b(rekomendasi|daftar|apa saja|beberapa|sebutkan|cari|pilihan)\b/.test(normalizedMessage)
    || (/\b(gunung|bukit|destinasi|puncak)\b/.test(normalizedMessage) && /\b(di|wilayah|kawasan)\b/.test(normalizedMessage));
  if (!region && !asksForRanking && !asksForCount) return null;
  if (!asksForRanking && !asksForList && !asksForCount) return null;

  let matchingPlaces = places.filter((place) => (
    !region || place.regionLabel === region || place.location === region
  ));
  const requestedKind = /\bbukit\b/.test(normalizedMessage)
    ? "bukit"
    : /\b(gunung|mountain|mount)\b/.test(normalizedMessage)
      ? "gunung"
      : null;
  if (requestedKind) {
    matchingPlaces = matchingPlaces.filter((place) => place.kind === requestedKind);
  }

  if (asksForCount) {
    const regionName = region ? `di ${region}` : "di seluruh katalog NUSA";
    const kindName = requestedKind === "bukit" ? "bukit" : requestedKind === "gunung" ? "gunung" : "bentang alam";
    const count = matchingPlaces.length;
    return {
      id: `count-${region ? normalizeText(region) : "indonesia"}-${requestedKind ?? "all"}`,
      response: `Dalam katalog NUSA terdapat ${count.toLocaleString("id-ID")} catatan ${kindName} ${regionName}. Angka ini adalah jumlah entri katalog, bukan jumlah resmi seluruh gunung atau bukit di wilayah tersebut.`,
      suggestions: [
        `Gunung tertinggi ${region ? `di ${region}` : "di Indonesia"} apa?`,
        "Sebutkan 3 gunung tertinggi di Indonesia",
      ],
    };
  }

  const ascending = /\b(terendah|paling rendah)\b/.test(normalizedMessage);
  const rankedPlaces = matchingPlaces
    .filter((place) => place.elevation !== null)
    .sort((left, right) => ascending
      ? left.elevation - right.elevation
      : right.elevation - left.elevation);
  if (rankedPlaces.length === 0) return null;

  const numberWords = { satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5 };
  const requestedCount = Number(normalizedMessage.match(/\b[1-5]\b/)?.[0])
    || Object.entries(numberWords).find(([word]) => new RegExp(`\\b${word}\\b`).test(normalizedMessage))?.[1];
  const asksForSeveral = /\b(rekomendasi|daftar|apa saja|beberapa|sebutkan|top)\b/.test(normalizedMessage)
    || Boolean(requestedCount);
  const count = asksForRanking
    ? Math.min(requestedCount ?? (asksForSeveral ? 3 : 1), 5, rankedPlaces.length)
    : Math.min(3, rankedPlaces.length);
  const selectedPlaces = rankedPlaces.slice(0, count);
  const list = selectedPlaces.map((place) => (
    `${place.name} (${place.elevation.toLocaleString("id-ID")} mdpl)`
  )).join(", ");
  const opener = region
    ? choosePhrase(responses.answerComposition.regionOpeners, message).replace("{region}", region)
    : choosePhrase(responses.answerComposition.nationalOpeners, message);
  const rankingLabel = ascending ? "terendah" : "tertinggi";
  const response = asksForRanking
    ? `${opener} ${count > 1 ? `${count} catatan ketinggian ${rankingLabel}` : `catatan ketinggian ${rankingLabel}`} yang tersedia adalah ${list}. Angka ini mengikuti dataset NUSA dan dapat berbeda antar-sumber.`
    : `${opener} saya menemukan ${list} dalam katalog NUSA. Daftar ini berdasarkan data lokasi dan ketinggian, bukan penilaian tingkat kesulitan atau rekomendasi keselamatan.`;

  return {
    id: `region-${region ? normalizeText(region) : "indonesia"}`,
    response,
    suggestions: ["Tampilkan detail destinasi", "Tips menjaga alam"],
  };
}

function resolvePlaceQuestion(message, place) {
  const normalizedMessage = normalizeText(message);
  const placeName = /^(gunung|bukit|puncak|pulau|danau|kawah|titik)\b/.test(normalizeText(place.name))
    ? place.name
    : `${place.kind === "bukit" ? "Bukit" : "Gunung"} ${place.name}`;
  const parts = [];
  const asksForDescription = /\b(jelaskan|deskripsi|deskripsikan|ceritakan|gambarkan|gambaran|tentang|profil|informasi|info)\b/.test(normalizedMessage);

  if (/\b(lokasi|dimana|di mana|letak|alamat|provinsi|wilayah)\b/.test(normalizedMessage)) {
    parts.push(`lokasinya tercatat di ${place.location}, wilayah ${place.regionLabel}.`);
  }
  if (/\b(koordinat|lintang|bujur)\b/.test(normalizedMessage)) {
    parts.push(`koordinat pada data NUSA adalah ${place.coordinates} (WGS84).`);
  }
  if (/\b(ketinggian|tinggi|mdpl|elevasi)\b/.test(normalizedMessage)) {
    parts.push(place.elevation === null
      ? "Data ketinggiannya belum tersedia."
      : `ketinggiannya tercatat ${place.elevation.toLocaleString("id-ID")} mdpl.`);
  }
  if (/\b(jenis|tipe|klasifikasi|vulkanik|stratovolcano|complex volcano)\b/.test(normalizedMessage)) {
    parts.push(`jenis yang dicatat pada dataset adalah ${place.type.toLocaleLowerCase("id")}.`);
  }
  if (/\b(status|aman|bahaya|erupsi|siaga)\b/.test(normalizedMessage)) {
    parts.push(`status atlas saat ini “${place.status}”, bukan informasi real-time. Periksa MAGMA Indonesia/PVMBG dan pengelola kawasan untuk kondisi terkini.`);
  }
  if (/\b(cuaca|weather|hujan|suhu)\b/.test(normalizedMessage)) {
    parts.push(`untuk cuaca ${place.name}, lihat kartu cuaca pada halaman Jelajah dan tetap rujuk peringatan resmi sebelum beraktivitas.`);
  }
  if (/\b(jalur|akses|buka|berkunjung|kunjungan)\b/.test(normalizedMessage)) {
    parts.push("dataset NUSA tidak memverifikasi jalur maupun akses terkini; konfirmasikan langsung kepada pengelola kawasan sebelum berangkat.");
  }
  if (asksForDescription) {
    parts.push(...place.descriptionParagraphs);
  }
  if (parts.length === 0) {
    parts.push(place.summary);
    parts.push(`Destinasi ini berada di ${place.location}, wilayah ${place.regionLabel}${place.elevation === null
      ? "."
      : `, dengan ketinggian tercatat ${place.elevation.toLocaleString("id-ID")} mdpl.`}`);
    parts.push("Sebutkan lokasi, ketinggian, koordinat, atau deskripsi jika ingin detail tertentu.");
  }

  const openerPhrases = asksForDescription
    ? responses.answerComposition.descriptionOpeners
    : responses.answerComposition.placeOpeners;
  const opener = choosePhrase(openerPhrases, message).replace("{name}", placeName);
  return {
    id: `place-${place.id}`,
    response: `${opener} ${parts.join(" ")}`,
    suggestions: [`Tampilkan detail ${placeName}`, "Tips menjaga alam"],
  };
}

function resolveResponse(message) {
  const placeMatch = findPlaceMatch(message);
  const intentMatch = getBestMatch(message, responses.intents);
  const normalizedMessage = normalizeText(message);
  if (placeMatch?.score >= 0.64 && (!intentMatch || placeMatch.score >= intentMatch.score || /\b(lokasi|koordinat|ketinggian|tinggi|mdpl|status|aman|cuaca)\b/.test(normalizedMessage))) {
    return resolvePlaceQuestion(message, placeMatch.place);
  }

  const regionalAnswer = resolveRegionalQuestion(message, normalizedMessage);
  if (regionalAnswer) return regionalAnswer;

  if (intentMatch?.score >= 0.4) {
    if (intentMatch.entry.directResponse) return intentMatch.entry;

    const opener = choosePhrase(responses.answerComposition.openers, message);
    const response = `${opener} ${intentMatch.entry.response}`;
    return { ...intentMatch.entry, response };
  }

  const topic = message.trim().replace(/[?.!,]+$/g, "");
  const opener = choosePhrase(responses.answerComposition.fallbackOpeners, message)
    .replace("{topic}", topic);
  return {
    ...responses.fallback,
    response: `${opener} ${responses.answerComposition.followUp}`,
  };
}

function Chatbot({ pageMode = false, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: responses.welcome,
      suggestions: responses.welcomeSuggestions,
    },
  ]);
  const conversationRef = useRef(null);
  const responseTimerRef = useRef(null);

  useEffect(() => {
    if (isOpen || pageMode) conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
  }, [isOpen, isTyping, messages, pageMode]);

  useEffect(() => () => window.clearTimeout(responseTimerRef.current), []);

  function sendMessage(value = draft) {
    const text = value.trim();
    if (!text || isTyping) return;

    setMessages((current) => [...current, { id: `${Date.now()}-user`, role: "user", text }]);
    setDraft("");
    setIsTyping(true);
    responseTimerRef.current = window.setTimeout(() => {
      const answer = resolveResponse(text);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-${answer.id ?? "fallback"}`,
          role: "assistant",
          text: answer.response,
          suggestions: answer.suggestions,
        },
      ]);
      setIsTyping(false);
    }, 650);
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <div className={`chat-widget${pageMode ? " is-page" : ""}`}>
      {(isOpen || pageMode) && (
        <section
          className={`chat-panel${pageMode ? " is-full-page" : ""}`}
          role={pageMode ? "region" : "dialog"}
          aria-modal={pageMode ? undefined : "false"}
          aria-labelledby="chat-title"
        >
          <div className="chat-header">
            <span className="chat-avatar" aria-hidden="true"><ChatIcon /></span>
            <div>
              <h2 id="chat-title">Teman Jelajah</h2>
              <p><span className="chat-online-dot" /> Panduan data lokal NUSA</p>
            </div>
            <button
              className="chat-close"
              type="button"
              aria-label={pageMode ? "Kembali ke beranda" : "Tutup chat"}
              onClick={() => {
                if (pageMode) onNavigate("/");
                else setIsOpen(false);
              }}
            >
              {pageMode ? <Icon name="arrow-left" /> : <ChatIcon close />}
            </button>
          </div>

          <div className="chat-messages" ref={conversationRef} aria-live="polite">
            <p className="chat-date-label">PERCAKAPAN ECO-ATLAS</p>
            {messages.map((message) => (
              <div className={`chat-message-row is-${message.role}`} key={message.id}>
                <div className={`chat-message is-${message.role}`}>
                  <p>{message.text}</p>
                  {message.suggestions?.length > 0 && (
                    <div className="chat-suggestions">
                      {message.suggestions.map((suggestion) => (
                        <button key={suggestion} type="button" disabled={isTyping} onClick={() => sendMessage(suggestion)}>
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-message-row is-assistant">
                <div className="chat-message is-assistant chat-typing" role="status" aria-label="Sedang menyiapkan jawaban">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          <form className="chat-input-form" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="chat-input">Tulis pertanyaan</label>
            <input
              id="chat-input"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Tanya tentang destinasi..."
              maxLength={400}
              autoComplete="off"
            />
            <button type="submit" disabled={!draft.trim() || isTyping} aria-label="Kirim pesan">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                <path d="m3.5 10 12-6-3.7 12-2.1-5.8L3.5 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="m9.7 10.2 5.8-6.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </form>
          <p className="chat-disclaimer">Jawaban dirangkai dari dataset JSON NUSA; status dan cuaca tidak selalu real-time.</p>
        </section>
      )}
      <button
        className={`chat-launcher${isOpen ? " is-open" : ""}`}
        type="button"
        aria-label={isOpen ? "Tutup teman jelajah" : "Buka teman jelajah"}
        aria-expanded={isOpen || pageMode}
        onClick={() => {
          if (window.matchMedia("(max-width: 760px)").matches) {
            onNavigate("/chat");
            return;
          }
          setIsOpen((open) => !open);
        }}
      >
        <ChatIcon close={isOpen} />
        {!isOpen && <span>Teman Jelajah</span>}
      </button>
    </div>
  );
}

export default Chatbot;
