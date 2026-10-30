// Tiny on-device language identification: Unicode script detection plus
// stopword voting. No models, no network, deterministic. It guesses from
// marker words, so short or jargon-heavy texts honestly report "uncertain".
export type LanguageGuess = {
  code: string;
  label: string;
  confidence: "high" | "medium" | "low";
};
type ScriptId =
  | "latin"
  | "cyrillic"
  | "greek"
  | "arabic"
  | "hebrew"
  | "han"
  | "hiragana"
  | "katakana"
  | "hangul"
  | "devanagari"
  | "thai"
  | "other";
const RANGES: [ScriptId, number, number][] = [
  ["latin", 0x41, 0x7a],
  ["latin", 0xc0, 0xff],
  ["latin", 0x100, 0x17f],
  ["cyrillic", 0x400, 0x4ff],
  ["greek", 0x370, 0x3ff],
  ["arabic", 0x600, 0x6ff],
  ["hebrew", 0x590, 0x5ff],
  ["han", 0x4e00, 0x9fff],
  ["hiragana", 0x3040, 0x309f],
  ["katakana", 0x30a0, 0x30ff],
  ["hangul", 0x1100, 0x11ff],
  ["hangul", 0xac00, 0xd7af],
  ["devanagari", 0x900, 0x97f],
  ["thai", 0xe00, 0xe7f],
];
export function scriptOf(char: string): ScriptId {
  const code = char.codePointAt(0) ?? 0;
  for (const [script, from, to] of RANGES) if (code >= from && code <= to) return script;
  return "other";
}
export function detectScript(text: string): { script: ScriptId; share: number; letters: number } {
  const counts = new Map<ScriptId, number>();
  let letters = 0;
  for (const char of text) {
    const script = scriptOf(char);
    if (script === "other") continue;
    letters++;
    counts.set(script, (counts.get(script) ?? 0) + 1);
  }
  let script: ScriptId = "other",
    best = 0;
  for (const [key, value] of counts) if (value > best) ((script = key), (best = value));
  return { script, share: letters ? best / letters : 0, letters };
}
const STOPWORDS: Record<string, string[]> = {
  en: "the and of to in a is that for it as was with be on are this by from or have an at not but they you we his her their our your had has were been will would can which all there when what so no if out about into over after them then than its".split(
    " ",
  ),
  es: "el la los las de del en y que por para con una uno se su sus al es son está están como más pero porque entre hasta desde donde cuando muy sin sobre también este esta estos estas eso hay fue han tiene tienen".split(
    " ",
  ),
  fr: "le la les de des du et en un une que qui est sont pour dans par sur avec pas plus tout toute tous toutes comme mais où ce cette ces son sa ses leur leurs notre nos votre vos aux au été être avoir fait".split(
    " ",
  ),
  de: "der die das den dem des und in von zu mit für auf ist sind war waren ein eine einer einem eines nicht auch als bei nach über aus zum zur sich sie er es wir ihr oder aber wenn weil durch wird werden kann nur schon noch".split(
    " ",
  ),
  it: "il lo la i gli le di del della dei degli delle al allo alla ai agli alle dal dallo dalla dai dagli dalle in con su per tra fra un uno una che chi non si è sono come più ma anche questo questa questi queste suo sua suoi sue loro nostro vostro nel".split(
    " ",
  ),
  pt: "o a os as de do da dos das em no na nos nas por pelo pela para com um uma e que se é são foi foram está estão como mais mas ou este esta estes estas isso seu sua seus suas nosso vossa entre até desde onde quando muito sem sobre também há tem têm".split(
    " ",
  ),
  nl: "de het een van en in op te dat die dit is zijn was waren voor met door aan als bij uit over naar dan maar want of ook niet geen hun haar onze jullie wordt worden kan kunnen zal zullen heeft hebben er hier daar waar wanneer".split(
    " ",
  ),
  ru: "и в на с не что это как для или его ее их мы вы они она оно был была были есть будет можно только уже еще такой такая такое такие этот эта эти того который которая которое которые при без между через после перед над под про же ли бы".split(
    " ",
  ),
  ar: "في من على إلى أن إن التي الذي الذين هذا هذه ذلك تلك مع عن ما لا لم لن قد كان كانت يكون تكون بين بعد قبل عند غير كل كما أو ثم أيضا حيث".split(
    " ",
  ),
  hi: "के की को में से पर है हैं था थी थे यह वह ये वे और का ने जो तो भी न नहीं क्या कब कहाँ कैसे बहुत सब अपने उनका इसके उसके द्वारा लिए तक साथ बीच बाद पहले".split(
    " ",
  ),
};
const LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
};
function tokensOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\u2000-\u206f]+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((token) => token.length > 0 && /[\p{L}]/u.test(token));
}
function vote(tokens: string[]): { code: string; hits: number; runnerUp: number } {
  const sets = Object.fromEntries(
    Object.entries(STOPWORDS).map(([code, words]) => [code, new Set(words)]),
  );
  const hits: Record<string, number> = {};
  for (const token of tokens)
    for (const code of Object.keys(sets))
      if (sets[code].has(token)) hits[code] = (hits[code] ?? 0) + 1;
  const ranked = Object.entries(hits).sort((a, b) => b[1] - a[1]);
  return {
    code: ranked[0]?.[0] ?? "unknown",
    hits: ranked[0]?.[1] ?? 0,
    runnerUp: ranked[1]?.[1] ?? 0,
  };
}
export function identifyLanguage(text: string): LanguageGuess {
  const uncertain: LanguageGuess = {
    code: "unknown",
    label: "Uncertain — too little recognizable text",
    confidence: "low",
  };
  const tokens = tokensOf(text);
  const { script, share, letters } = detectScript(text);
  if (letters >= 8 && share >= 0.5) {
    if (script === "hangul") return { code: "ko", label: "Korean", confidence: "high" };
    if (script === "hiragana" || script === "katakana")
      return { code: "ja", label: "Japanese", confidence: "high" };
    if (script === "han")
      return {
        code: "zh",
        label: "Chinese (simplified/traditional not distinguished)",
        confidence: "medium",
      };
    if (script === "thai") return { code: "th", label: "Thai", confidence: "high" };
    if (script === "hebrew") return { code: "he", label: "Hebrew", confidence: "high" };
    if (script === "greek") return { code: "el", label: "Greek", confidence: "high" };
  }
  if (tokens.length < 8) return uncertain;
  const stop = vote(tokens);
  if (share >= 0.5) {
    if (script === "arabic")
      return stop.code === "ar" && stop.hits >= 2
        ? { code: "ar", label: "Arabic", confidence: "high" }
        : { code: "ar", label: "Arabic script (often Arabic)", confidence: "medium" };
    if (script === "devanagari")
      return stop.code === "hi" && stop.hits >= 2
        ? { code: "hi", label: "Hindi", confidence: "high" }
        : { code: "hi", label: "Devanagari script (often Hindi)", confidence: "medium" };
    if (script === "cyrillic")
      return stop.code === "ru" && stop.hits >= 2
        ? { code: "ru", label: "Russian", confidence: "high" }
        : { code: "ru", label: "Cyrillic script (often Russian)", confidence: "medium" };
  }
  if (stop.hits >= 3 && LABELS[stop.code])
    return {
      code: stop.code,
      label: LABELS[stop.code],
      confidence: stop.hits >= 6 && stop.hits >= stop.runnerUp * 2 ? "high" : "medium",
    };
  return uncertain;
}
export function stopwordsFor(code: string): Set<string> {
  return new Set([...(STOPWORDS[code] ?? []), ...STOPWORDS.en]);
}
