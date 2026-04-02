/**
 * package.json exports에 types 경로가 없어 동적 import 시 선언을 연결합니다.
 */
declare module '@mediapipe/tasks-vision' {
  export { FilesetResolver, PoseLandmarker } from '../node_modules/@mediapipe/tasks-vision/vision';
}
