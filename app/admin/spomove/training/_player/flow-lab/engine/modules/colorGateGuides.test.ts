import { describe, expect, it } from 'vitest';
import {
  COLOR_GATE_POSE_DEFINITIONS,
  colorGatePosesForVariant,
} from './colorGateGuides';

describe('Motion Gate option image pools', () => {
  it('keeps single and compound solo/together pools separate and covers every pose once', () => {
    const easy = colorGatePosesForVariant('solo-easy');
    const normal = colorGatePosesForVariant('solo-normal');
    const togetherSingle = colorGatePosesForVariant('together-easy');
    const togetherCompound = colorGatePosesForVariant('together-normal');
    const togetherFamily = colorGatePosesForVariant('together-family');

    expect(easy).toHaveLength(20);
    expect(normal).toHaveLength(40);
    expect(togetherSingle).toHaveLength(5);
    expect(togetherCompound).toHaveLength(14);
    expect(togetherFamily).toHaveLength(4);

    expect(new Set([...normal, ...togetherCompound])).toEqual(new Set(
      COLOR_GATE_POSE_DEFINITIONS
        .filter((pose) => pose.difficulty !== 'family')
        .map((pose) => pose.key),
    ));
  });

  it('keeps the authored catalog order, identifiers, and metadata complete', () => {
    expect(COLOR_GATE_POSE_DEFINITIONS).toHaveLength(58);
    expect(new Set(COLOR_GATE_POSE_DEFINITIONS.map((pose) => pose.key))).toHaveLength(58);
    expect(new Set(COLOR_GATE_POSE_DEFINITIONS.map((pose) => pose.image))).toHaveLength(58);

    for (const pose of COLOR_GATE_POSE_DEFINITIONS) {
      expect(pose.label.trim()).not.toBe('');
      expect(['easy', 'hard', 'family']).toContain(pose.difficulty);
      expect(pose.image).toMatch(/^\/spomove\/dive\/color-gate\/.+\.png$/u);
    }

    for (const category of ['strength', 'flexibility', 'balance', 'power-jump'] as const) {
      const authored = COLOR_GATE_POSE_DEFINITIONS.filter((pose) => pose.category === category);
      expect(authored.filter((pose) => pose.difficulty === 'easy')).toHaveLength(5);
      expect(authored.filter((pose) => pose.difficulty === 'hard')).toHaveLength(5);
    }

    expect(COLOR_GATE_POSE_DEFINITIONS.slice(0, 10).map(({ key, difficulty }) => [key, difficulty])).toEqual([
      ['squat', 'easy'],
      ['plank', 'easy'],
      ['lunge', 'easy'],
      ['push-up', 'easy'],
      ['bear-hold', 'easy'],
      ['bridge', 'hard'],
      ['side-plank', 'hard'],
      ['superman-hold', 'hard'],
      ['v-sit-hold', 'hard'],
      ['crab-bridge', 'hard'],
    ]);

    expect(COLOR_GATE_POSE_DEFINITIONS.slice(10, 20).map(({ key, label, difficulty }) => [key, label, difficulty])).toEqual([
      ['standing-toe-touch', '서서 발끝 터치', 'easy'],
      ['butterfly', '나비 자세', 'easy'],
      ['standing-side-stretch', '서서 옆구리 스트레칭', 'easy'],
      ['child-pose', '고양이 자세', 'easy'],
      ['overhead-lunge-stretch', '앉아 다리벌리기', 'easy'],
      ['cobra', '오버헤드 런지', 'hard'],
      ['downward-dog', '코브라 자세', 'hard'],
      ['standing-quad-stretch', '다운독', 'hard'],
      ['seated-straddle', '뒤로 발등잡기', 'hard'],
      ['straddle-one-foot-hold', '앉아 다리벌려 한발 잡기', 'hard'],
    ]);

    expect(COLOR_GATE_POSE_DEFINITIONS[28]).toMatchObject({
      key: 'flamingo-pose',
      label: '한발 발잡기',
      category: 'balance',
      difficulty: 'hard',
      image: '/spomove/dive/color-gate/balance/one-leg-foot-hold.png',
    });

    expect(COLOR_GATE_POSE_DEFINITIONS.slice(34, 37).map(({ key, label, difficulty, image }) => [key, label, difficulty, image])).toEqual([
      ['clap-jump', '박수 점프', 'easy', '/spomove/dive/color-gate/power-jump/clap-jump.png'],
      ['frog-jump', '개구리 점프', 'hard', '/spomove/dive/color-gate/power-jump/frog-jump.png'],
      ['rotation-jump', '회전 점프', 'hard', '/spomove/dive/color-gate/power-jump/rotation-jump.png'],
    ]);

    expect(COLOR_GATE_POSE_DEFINITIONS.slice(40).map(({ key, label, difficulty }) => [key, label, difficulty])).toEqual([
      ['partner-hold', '스쿼트 홀드', 'easy'],
      ['partner-shoulder-waist-press', '어깨 잡고 눌러주기', 'easy'],
      ['partner-high-five', '하이파이브', 'easy'],
      ['partner-back-to-back', '백투백', 'easy'],
      ['partner-side-lunge', '사이드 런지', 'easy'],
      ['partner-hand-jump', '손잡고 점프', 'easy'],
      ['partner-leg-touch', '머리붙이기(마주보고)', 'easy'],
      ['partner-tunnel', '플랭크 하이파이브', 'hard'],
      ['partner-shoulder-balance', '어깨동무', 'hard'],
      ['partner-sit-to-stand', '앉았다 일어나기', 'hard'],
      ['partner-pull-up', '풀업', 'hard'],
      ['partner-squat', 'V밸런스', 'hard'],
      ['partner-stacking', '한발 들고 하이파이브', 'hard'],
      ['partner-one-leg-high-five', '인간 손수레', 'hard'],
      ['family-princess-carry', '공주님 안기', 'family'],
      ['family-airplane-play', '비행기 놀이', 'family'],
      ['family-piggyback', '어부바', 'family'],
      ['family-hug', '안아주기', 'family'],
    ]);
  });
});
