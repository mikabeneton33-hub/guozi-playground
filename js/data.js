// 國字樂園資料層。
//
// ⚠ 目前所有內容都是「版型示範用」的占位資料（BOOK.placeholder = true）：
//   課次 T1～T3 不是南一版第一冊的真實課次，只是拿 10 個常用字把整條流程跑通。
//   正式資料（課次結構、生字表）到手後整批取代，介面不用改。
//
// 欄位說明
//   LESSONS[].chars    本課生字（依課本順序）
//   LESSONS[].passage  自編短文＋題目（只用學過的字，未學字以 字{注音} 標注音）
//   CHARS[c].zy        國字讀音（教育部《重編國語辭典修訂本》）
//   CHARS[c].words     造詞 [詞, 注音]，注音以空格分音節，輕聲標在音節前（˙ㄗ）
//   CHARS[c].sentence  自編例句。標注音寫法：`字{ㄗˋ}`，沒標的字視為本課前已學過
//   CHARS[c].emoji     插圖（OpenMoji，CC BY-SA 4.0），對應 img/openmoji/<碼>.svg
export const BOOK = {
  name: "南一版 國語第一冊",
  grade: "一年級上學期",
  placeholder: true,
};

export const LESSONS = [
  {
    id: "T1", no: "示範一", title: "人・口・手・日",
    chars: ["人", "口", "手", "日"],
    passage: {
      title: "我{ㄨㄛˇ}的{˙ㄉㄜ}手",
      text: "我{ㄨㄛˇ}有{ㄧㄡˇ}兩{ㄌㄧㄤˇ}隻{ㄓ}手。\n手可{ㄎㄜˇ}以{ㄧˇ}拿{ㄋㄚˊ}東{ㄉㄨㄥ}西{ㄒㄧ}。\n人有{ㄧㄡˇ}口，口可{ㄎㄜˇ}以{ㄧˇ}說{ㄕㄨㄛ}話{ㄏㄨㄚˋ}。",
      questions: [
        { q: "手可{ㄎㄜˇ}以{ㄧˇ}做{ㄗㄨㄛˋ}什{ㄕㄣˊ}麼{˙ㄇㄜ}？", options: ["拿{ㄋㄚˊ}東{ㄉㄨㄥ}西{ㄒㄧ}", "說{ㄕㄨㄛ}話{ㄏㄨㄚˋ}", "睡{ㄕㄨㄟˋ}覺{ㄐㄧㄠˋ}"], answer: 0 },
        { q: "口可{ㄎㄜˇ}以{ㄧˇ}做{ㄗㄨㄛˋ}什{ㄕㄣˊ}麼{˙ㄇㄜ}？", options: ["拿{ㄋㄚˊ}東{ㄉㄨㄥ}西{ㄒㄧ}", "說{ㄕㄨㄛ}話{ㄏㄨㄚˋ}", "睡{ㄕㄨㄟˋ}覺{ㄐㄧㄠˋ}"], answer: 1 },
      ],
    },
  },
  { id: "T2", no: "示範二", title: "月・山・水・火", chars: ["月", "山", "水", "火"], passage: null },
  { id: "T3", no: "示範三", title: "大・小", chars: ["大", "小"], passage: null },
];

export const CHARS = {
  人: { zy: "ㄖㄣˊ", radical: "人", strokes: 2, emoji: "🧑",
    words: [["大人", "ㄉㄚˋ ㄖㄣˊ"], ["小人", "ㄒㄧㄠˇ ㄖㄣˊ"]],
    sentence: "媽{ㄇㄚ}媽{˙ㄇㄚ}是{ㄕˋ}大{ㄉㄚˋ}人。" },
  口: { zy: "ㄎㄡˇ", radical: "口", strokes: 3, emoji: "👄",
    words: [["人口", "ㄖㄣˊ ㄎㄡˇ"], ["口水", "ㄎㄡˇ ㄕㄨㄟˇ"]],
    sentence: "小{ㄒㄧㄠˇ}鳥{ㄋㄧㄠˇ}張{ㄓㄤ}開{ㄎㄞ}口。" },
  手: { zy: "ㄕㄡˇ", radical: "手", strokes: 4, emoji: "✋",
    words: [["大手", "ㄉㄚˋ ㄕㄡˇ"], ["小手", "ㄒㄧㄠˇ ㄕㄡˇ"]],
    sentence: "吃{ㄔ}飯{ㄈㄢˋ}前{ㄑㄧㄢˊ}要{ㄧㄠˋ}洗{ㄒㄧˇ}手。" },
  日: { zy: "ㄖˋ", radical: "日", strokes: 4, emoji: "☀️",
    words: [["日月", "ㄖˋ ㄩㄝˋ"]],
    sentence: "今{ㄐㄧㄣ}天{ㄊㄧㄢ}是{ㄕˋ}好{ㄏㄠˇ}日子{˙ㄗ}。" },
  月: { zy: "ㄩㄝˋ", radical: "月", strokes: 4, emoji: "🌙",
    words: [["日月", "ㄖˋ ㄩㄝˋ"]],
    sentence: "晚{ㄨㄢˇ}上{ㄕㄤˋ}有{ㄧㄡˇ}月亮{ㄌㄧㄤˋ}。" },
  山: { zy: "ㄕㄢ", radical: "山", strokes: 3, emoji: "⛰️",
    words: [["大山", "ㄉㄚˋ ㄕㄢ"], ["小山", "ㄒㄧㄠˇ ㄕㄢ"], ["火山", "ㄏㄨㄛˇ ㄕㄢ"]],
    sentence: "這{ㄓㄜˋ}座{ㄗㄨㄛˋ}山很{ㄏㄣˇ}高{ㄍㄠ}。" },
  水: { zy: "ㄕㄨㄟˇ", radical: "水", strokes: 4, emoji: "💧",
    words: [["口水", "ㄎㄡˇ ㄕㄨㄟˇ"], ["山水", "ㄕㄢ ㄕㄨㄟˇ"], ["大水", "ㄉㄚˋ ㄕㄨㄟˇ"]],
    sentence: "口渴{ㄎㄜˇ}了{˙ㄌㄜ}，我{ㄨㄛˇ}要{ㄧㄠˋ}喝{ㄏㄜ}水。" },
  火: { zy: "ㄏㄨㄛˇ", radical: "火", strokes: 4, emoji: "🔥",
    words: [["火山", "ㄏㄨㄛˇ ㄕㄢ"], ["大火", "ㄉㄚˋ ㄏㄨㄛˇ"]],
    sentence: "不{ㄅㄨˋ}可{ㄎㄜˇ}以{ㄧˇ}玩{ㄨㄢˊ}火。" },
  大: { zy: "ㄉㄚˋ", radical: "大", strokes: 3, emoji: "🐘",
    words: [["大人", "ㄉㄚˋ ㄖㄣˊ"], ["大山", "ㄉㄚˋ ㄕㄢ"]],
    sentence: "大象{ㄒㄧㄤˋ}有{ㄧㄡˇ}大大的{˙ㄉㄜ}耳{ㄦˇ}朵{˙ㄉㄨㄛ}。" },
  小: { zy: "ㄒㄧㄠˇ", radical: "小", strokes: 3, emoji: "🐜",
    words: [["小人", "ㄒㄧㄠˇ ㄖㄣˊ"], ["小手", "ㄒㄧㄠˇ ㄕㄡˇ"]],
    sentence: "小鳥{ㄋㄧㄠˇ}在{ㄗㄞˋ}唱{ㄔㄤˋ}歌{ㄍㄜ}。" },
};

export const lessonOf = c => LESSONS.find(l => l.chars.includes(c));
export const lessonIndex = id => LESSONS.findIndex(l => l.id === id);
/** 到某課為止（含）學過的字 */
export const learnedThrough = id => new Set(LESSONS.slice(0, lessonIndex(id) + 1).flatMap(l => l.chars));
export const allChars = () => LESSONS.flatMap(l => l.chars);
