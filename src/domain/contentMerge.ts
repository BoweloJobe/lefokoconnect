import { AdminContentBundle, Level, SetswanaWord } from "../types";

function wordKey(word: SetswanaWord): string {
  return word.word.trim().toUpperCase();
}

export function mergeDictionaryWords(staticWords: SetswanaWord[], bundle: AdminContentBundle): SetswanaWord[] {
  const seen = new Set(staticWords.map(wordKey));
  const seenContentIds = new Set<string>();
  const merged = [...staticWords];

  bundle.words.forEach((uploaded) => {
    const key = wordKey(uploaded);
    if (!uploaded.enabled || seen.has(key) || seenContentIds.has(uploaded.contentId)) return;
    seenContentIds.add(uploaded.contentId);
    seen.add(key);
    const { contentId, source, enabled, createdAt, updatedAt, ...word } = uploaded;
    merged.push(word);
  });

  return merged;
}

export function mergeLevels(staticLevels: Level[], bundle: AdminContentBundle): Level[] {
  const seenIds = new Set(staticLevels.map((level) => level.id));
  const seenLevelNumbers = new Set(staticLevels.map((level) => level.levelNumber));
  const seenContentIds = new Set<string>();
  const merged = [...staticLevels];

  bundle.levels.forEach((uploaded) => {
    if (!uploaded.enabled || !uploaded.validation.valid) return;
    if (seenContentIds.has(uploaded.contentId)) return;
    if (seenIds.has(uploaded.level.id) || seenLevelNumbers.has(uploaded.level.levelNumber)) return;

    seenContentIds.add(uploaded.contentId);
    seenIds.add(uploaded.level.id);
    seenLevelNumbers.add(uploaded.level.levelNumber);
    merged.push(uploaded.level);
  });

  return merged.sort((a, b) => a.levelNumber - b.levelNumber);
}
