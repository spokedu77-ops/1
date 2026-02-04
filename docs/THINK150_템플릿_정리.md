# Think 150 템플릿 정리

## 1. 주차별 구성

| 주차 | Stage A/B/C 이미지 | 비고 |
|------|-------------------|------|
| **1주차** | 색상만 | 이미지 없음 |
| **2주차** | 주차별 pack 사용 | week2 전용 이미지 |
| **3주차** | 주차별 pack 사용 | week3 전용 이미지 |
| **4주차** | 주차별 pack 사용 | week4 전용 이미지 |

## 2. Asset 구조 (주차별)

```
thinkPackByWeek: {
  week2: { setA: { red, green, yellow, blue }, setB: { ... } },
  week3: { setA: { ... }, setB: { ... } },
  week4: { setA: { ... }, setB: { ... } }
}
```

- **setA**: Stage C 0~30초 구간
- **setB**: Stage C 30~60초 구간
- **Stage A/B**: 해당 주차 pack의 setA 사용 (이미지 사용 시)

## 3. Storage 경로

```
themes/think150/iiwarmup_think_default/
  week2/setA/red/xxx.webp
  week2/setA/green/xxx.webp
  ...
  week2/setB/red/xxx.webp
  ...
  week3/setA/...
  week4/setA/...
```

## 4. 이미지 표시 규칙

- **이미지 = 색상 대신**: 이미지가 있으면 색상을 완전히 대체, `object-cover`로 화면 꽉 채움
- **1주차**: 항상 색상만 (이미지 사용 안 함)

## 5. 오디오

- **효과음**: cue마다 tick, Week4 recall 시 recall-start
- **Pause/Reset**: 즉시 중단 (`suspendAudioContext`)
- **BGM**: `docs/THINK150_BGM_가이드.md` 참고

## 6. AssetHub 사용법

1. `/admin/iiwarmup/assets` 접속
2. 2주차 / 3주차 / 4주차 탭 선택
3. setA, setB 각각 4색(빨/초/노/파) 이미지 업로드
4. Think Studio에서 해당 주차 선택 시 자동 적용
