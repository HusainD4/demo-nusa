export function resolveRoute(pathname) {
  const detailMatch = pathname.match(/^\/jelajah\/([^/]+)\/?$/);
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const activePage = normalizedPath === "/"
    ? "/"
    : normalizedPath === "/jelajah" || detailMatch
    ? "/jelajah"
    : ["/403", "/404", "/505"].includes(normalizedPath)
      ? normalizedPath
    : normalizedPath === "/peta"
      ? "/peta"
    : normalizedPath === "/chat"
      ? "/chat"
    : normalizedPath === "/bookmark"
      ? "/bookmark"
    : normalizedPath === "/kontribusi"
      ? "/kontribusi"
      : normalizedPath === "/tentang"
        ? "/tentang"
        : normalizedPath === "/kontak"
          ? "/kontak"
          : "/404";

  return {
    activePage,
    detailId: detailMatch?.[1] ?? null,
  };
}