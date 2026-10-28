export function indexNowPayload(site: string, key: string, keyFile: string, urls: string[]) {
  const base = new URL(site.replace(/\/$/, "") + "/");
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    ["localhost", "example.invalid"].includes(base.hostname)
  )
    throw new Error("A real deployed HTTPS URL is required for submission.");
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key) || !/^[A-Za-z0-9-]+\.txt$/.test(keyFile))
    throw new Error("Invalid IndexNow ownership proof.");
  const list = [...new Set(urls)];
  if (!list.length || list.length > 10000)
    throw new Error("Submit 1–10,000 changed URLs, not arbitrary bulk URLs.");
  for (const value of list) {
    const u = new URL(value);
    if (
      u.origin !== base.origin ||
      !u.pathname.startsWith(base.pathname) ||
      u.username ||
      u.password ||
      u.hash
    )
      throw new Error("URL is outside the verified site path.");
  }
  return { host: base.host, key, keyLocation: new URL(keyFile, base).href, urlList: list };
}
