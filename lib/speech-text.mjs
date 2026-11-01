// Keep conversational text and punctuation, but never send emoji components to TTS.
export function speechText(text) {
  const clean = text
    .replace(/[0-9#*]\uFE0F?\u20E3/gu, ' ')
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u200D\uFE0E\uFE0F\u20E3\u{E0020}-\u{E007F}]/gu, ' ')
    .replace(/\s+/gu, ' ').trim();
  return /[\p{L}\p{N}]/u.test(clean) ? clean : '';
}
