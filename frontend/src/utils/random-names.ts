// ランダムな名前生成用のデータ
const adjectives = [
  'Happy', 'Creative', 'Bright', 'Swift', 'Clever',
  'Gentle', 'Bold', 'Wise', 'Kind', 'Cool',
  'Smart', 'Quick', 'Calm', 'Brave', 'Sharp'
];

const nouns = [
  'Panda', 'Eagle', 'Tiger', 'Dragon', 'Phoenix',
  'Wolf', 'Fox', 'Bear', 'Lion', 'Hawk',
  'Raven', 'Falcon', 'Shark', 'Dolphin', 'Owl'
];

const roomPrefixes = [
  'Design', 'Creative', 'Project', 'Team', 'Work',
  'Collab', 'Studio', 'Board', 'Space', 'Hub'
];

export function generateRandomUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100);
  return `${adjective}${noun}${number}`;
}

export function generateRandomRoomName(): string {
  const prefix = roomPrefixes[Math.floor(Math.random() * roomPrefixes.length)];
  const number = Math.floor(Math.random() * 10000);
  return `${prefix}-${number}`;
}

// ユーザー名の保存と読み込み
const USERNAME_STORAGE_KEY = 'excalidraw-collab-username';

export function saveUsername(username: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(USERNAME_STORAGE_KEY, username);
  }
}

export function loadUsername(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(USERNAME_STORAGE_KEY);
  }
  return null;
}

export function getOrCreateUsername(): string {
  const savedUsername = loadUsername();
  if (savedUsername) {
    return savedUsername;
  }
  
  const newUsername = generateRandomUsername();
  saveUsername(newUsername);
  return newUsername;
}