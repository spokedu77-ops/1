# SPOKEDU 이미지 (`public/images/spokedu`)

실제 수업 사진은 **아래 경로에 동일 파일명**으로 넣으면 `app/spokedu/data/images.ts`의 `SPOKEDU_IMAGES`와 자동 연결됩니다.

## 폴더 구조

```
public/images/spokedu/
  _fallback/          # 카테고리별 premium placeholder (SVG, 화면 문구 없음)
  home/
  private/
  dispatch/
  curriculum/
  programs/
  records/
  cases/
  monthly/
```

## 교체할 실제 파일 (JPG 권장)

### Home (`home/`)
| 파일 | 용도 |
|------|------|
| `hero.jpg` | 홈 Hero |
| `lab-scene.jpg` | LAB / Living Proof |
| `dispatch-scene.jpg` | 기관 수업 톤 |

### Private (`private/`)
| 파일 | 용도 |
|------|------|
| `one-to-one.jpg` | 1:1 수업 Hero |
| `small-group.jpg` | 소그룹 수업 |
| `tool-activity.jpg` | 교구 활동 |

### Dispatch (`dispatch/`)
| 파일 | 용도 |
|------|------|
| `group-class.jpg` | 기관 정규 수업 Hero |
| `kiwoom-center.jpg` | 키움·기관 현장 |
| `one-day-event.jpg` | 원데이 행사 |

### Curriculum (`curriculum/`)
| 파일 | 용도 |
|------|------|
| `lesson-plan.jpg` | 수업안 Hero |
| `tool-setup.jpg` | 교구 세팅 |
| `instructor-training.jpg` | 강사 교육 |
| `program-materials.jpg` | 프로그램 자료 |

### Programs (`programs/`)
| 파일 | 용도 |
|------|------|
| `spomove.jpg` | SPOMOVE 카드 |
| `paps.jpg` | PAPS 카드 |
| `play-class.jpg` | 놀이체육 |
| `one-day.jpg` | 원데이 |
| `camp.jpg` | 방학캠프 |
| `curriculum-content.jpg` | 커리큘럼 콘텐츠 |

### Records (`records/`) — 사례 썸네일
| 파일 | 용도 |
|------|------|
| `lab.jpg` | 스포키듀 LAB |
| `yangcheon.jpg` | 양천 키움 SPOMOVE |
| `dongjak.jpg` | 동작 리듬챌린지 |
| `dasarang.jpg` | 다사랑 원데이 |
| `playz.jpg` | PLAYZ 방학캠프 |
| `seodaemun.jpg` | 서대문 어린이날 부스 |

### Cases / Monthly
| 경로 | 파일 |
|------|------|
| `cases/` | `hero.jpg`, `representative.jpg` |
| `monthly/` | `hero.jpg`, `representative.jpg` |

## 운영 규칙

- 파일명만 맞추면 코드 수정 없이 반영됩니다.
- 사진이 없거나 로드 실패 시 `_fallback/{category}.svg`로 자동 대체됩니다.
- UI에 slot/교체 안내 문구는 **노출하지 않습니다** (`SpokeduImage` 사용).
- 모든 이미지에는 `images.ts`에 정의된 **alt**가 적용됩니다.

## 코드 참조

- 데이터: `app/spokedu/data/images.ts` (`SPOKEDU_IMAGES`, `spokeduPageImageMap`)
- 컴포넌트: `app/spokedu/components/spokedu-image.tsx`
