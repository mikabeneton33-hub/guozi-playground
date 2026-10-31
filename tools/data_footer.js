export const lessonOf = c => LESSONS.find(l => l.chars.includes(c));
export const lessonIndex = id => LESSONS.findIndex(l => l.id === id);
/** 到某課為止（含）學過的字 */
export const learnedThrough = id => new Set(LESSONS.slice(0, lessonIndex(id) + 1).flatMap(l => l.chars));
export const allChars = () => LESSONS.flatMap(l => l.chars);
