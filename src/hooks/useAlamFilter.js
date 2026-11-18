import { useMemo } from "react";

function normalizeSearchText(value) {
  return value
    .toLocaleLowerCase("id")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function useAlamFilter(items, { category, region, query, sort }) {
  const searchableItems = useMemo(
    () => items.map((item) => ({
      item,
      searchText: normalizeSearchText([
        item.name,
        item.location,
        item.kind,
        item.type,
        item.region,
        item.regionLabel,
      ].filter(Boolean).join(" ")),
    })),
    [items],
  );

  return useMemo(() => {
    const queryTerms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
    const filtered = searchableItems.filter(({ item, searchText }) => {
      const matchesCategory = category === "semua" || item.kind === category;
      const matchesRegion = region === "semua" || item.region === region;
      const matchesQuery = queryTerms.every((term) => searchText.includes(term));
      return matchesCategory && matchesRegion && matchesQuery;
    }).map(({ item }) => item);

    return filtered.sort((a, b) => {
      if (sort === "elevation-asc") return (a.elevation ?? Infinity) - (b.elevation ?? Infinity);
      if (sort === "name") return a.name.localeCompare(b.name, "id");
      return (b.elevation ?? -Infinity) - (a.elevation ?? -Infinity);
    });
  }, [searchableItems, category, region, query, sort]);
}