// Random room name generators
const ROOM_ADJECTIVES = [
  '青い', '赤い', '緑の', '黄色い', '紫の', '桃色の', '橙色の', '白い', '黒い', '金の',
  '明るい', '暗い', '小さな', '大きな', '新しい', '古い', '美しい', '可愛い', '涼しい', '暖かい',
  '静かな', '賑やかな', '神秘的な', '魔法の', '秘密の', '特別な', '平和な', '楽しい', '幸せな', '輝く'
];

const ROOM_NOUNS = [
  'ルーム', '部屋', 'スペース', '工房', 'アトリエ', 'スタジオ', 'ラボ', 'オフィス', 'カフェ', 'ガーデン',
  '図書館', '教室', 'ホール', '会議室', '研究室', '作業場', 'クラブ', 'サロン', 'ギャラリー', 'テラス',
  '基地', '城', '小屋', '隠れ家', '拠点', '本部', 'センター', 'ハウス', 'ロフト', 'コーナー'
];

// Random username generators - Japanese style names and fun nicknames
const USER_PREFIXES = [
  'あお', 'あか', 'みどり', 'きいろ', 'むらさき', 'しろ', 'くろ', 'きん', 'ぎん', 'にじ',
  'そら', 'うみ', 'やま', 'かわ', 'もり', 'はな', 'ほし', 'つき', 'たいよう', 'かぜ',
  'ゆき', 'あめ', 'くも', 'ひかり', 'かげ', 'みず', 'ひ', 'つち', 'き', 'いし'
];

const USER_SUFFIXES = [
  'さん', 'ちゃん', 'くん', 'ひと', 'ユーザー', '先生', '博士', '職人', '魔法使い', '忍者',
  '探検家', '芸術家', '学者', '研究者', '開発者', 'デザイナー', 'クリエイター', 'エンジニア', 'アーティスト', 'マスター',
  '初心者', '上級者', '専門家', 'プロ', '達人', '名人', '師匠', '弟子', '仲間', 'パートナー'
];

// Animals for cute usernames
const ANIMALS = [
  'ねこ', 'いぬ', 'うさぎ', 'はむすたー', 'ぱんだ', 'こあら', 'ぺんぎん', 'ふくろう', 'きつね', 'たぬき',
  'りす', 'くま', 'とら', 'らいおん', 'ぞう', 'きりん', 'しまうま', 'かえる', 'いるか', 'くじら'
];

/**
 * Generate a random room name
 */
export function generateRandomRoomName(): string {
  const adjective = ROOM_ADJECTIVES[Math.floor(Math.random() * ROOM_ADJECTIVES.length)];
  const noun = ROOM_NOUNS[Math.floor(Math.random() * ROOM_NOUNS.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  
  return `${adjective}${noun}${number}`;
}

/**
 * Generate a random username
 */
export function generateRandomUserName(): string {
  const type = Math.random();
  
  if (type < 0.4) {
    // Color + suffix style
    const prefix = USER_PREFIXES[Math.floor(Math.random() * USER_PREFIXES.length)];
    const suffix = USER_SUFFIXES[Math.floor(Math.random() * USER_SUFFIXES.length)];
    return `${prefix}${suffix}`;
  } else if (type < 0.7) {
    // Animal + suffix style
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const suffix = USER_SUFFIXES[Math.floor(Math.random() * USER_SUFFIXES.length)];
    return `${animal}${suffix}`;
  } else {
    // Animal + number style
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const number = Math.floor(Math.random() * 99) + 1;
    return `${animal}${number}`;
  }
}

/**
 * Generate a random user ID for internal use
 */
export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}