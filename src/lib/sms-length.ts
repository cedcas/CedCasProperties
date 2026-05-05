// Pure-JS SMS segment counter — safe to import from client components.
// Kept separate from sms.ts (Twilio driver, node-only) so the bundler can tree-shake.

const GSM7_RE = /^[ -@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\^{}\\\[~\]|€\n\r ]*$/;

export function smsLength(body: string): { encoding: "GSM-7" | "UCS-2"; chars: number; segments: number; perSegment: number } {
  const isGSM = GSM7_RE.test(body);
  const encoding = isGSM ? "GSM-7" : "UCS-2";
  const chars = body.length;
  const single = isGSM ? 160 : 70;
  const concat = isGSM ? 153 : 67;
  const segments = chars === 0 ? 0 : chars <= single ? 1 : Math.ceil(chars / concat);
  const perSegment = segments <= 1 ? single : concat;
  return { encoding, chars, segments, perSegment };
}
