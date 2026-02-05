/**
 * 빌드 시 public/firebase-messaging-config.js 생성.
 * SW 본체(public/firebase-messaging-sw.js)는 정적, config만 env로 생성.
 * 환경 변수 없으면 스텁(config 빈 객체)으로 404 방지.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'firebase-messaging-config.js');

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

const hasConfig = config.apiKey && config.projectId;
const script = hasConfig
  ? 'self.__FIREBASE_CONFIG__ = ' + JSON.stringify(config) + ';\n'
  : 'self.__FIREBASE_CONFIG__ = {};\n';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, script, 'utf8');
console.log('[generate-firebase-sw]', hasConfig ? 'firebase-messaging-config.js written' : 'Stub config written (no Firebase env)');
