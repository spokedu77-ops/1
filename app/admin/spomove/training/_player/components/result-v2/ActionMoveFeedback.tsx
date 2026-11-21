import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown, Hand, Footprints, Timer, Check, CircleStop, MoveRight, Sparkles } from 'lucide-react';
import type { buildTrainingResultV2Model } from '../../lib/trainingResultV2Model';
import type { DiveActionMoveSession } from '../../lib/diveActionMoveReport';
import { ResultV2Actions, ResultV2Frame } from './ResultV2Frame';
import styles from './ActionMoveFeedback.module.css';

const icons = { '점프': ArrowUp, '숙이기': ArrowDown, '펀치': Hand, '킥': Footprints, '연속 타격': Hand };

export function ActionMoveFeedback({ model, theme, session, student, onBack, onRetry, resultActions, resultNotice, footer }: {
  model: ReturnType<typeof buildTrainingResultV2Model>;
  theme: string; session?: DiveActionMoveSession | null; student?: { name: string } | null;
  onBack: () => void; onRetry: () => void; resultActions?: ReactNode; resultNotice?: ReactNode; footer?: ReactNode;
}) {
  const { vm, settings } = model;
  const complete = vm.reason === 'natural_complete';
  const stopped = vm.reason === 'stopped_early';
  const status = complete ? '활동 완료' : stopped ? '중도 종료' : vm.reason === 'cancelled' ? '활동 취소' : '실행 오류';
  const configured = [...new Set(settings.filter(item => ['actions', 'modules'].includes(item.id))
    .flatMap(item => item.value.split(' · ')))];
  const actions = configured.filter(label => label !== '보너스');
  const stage = settings.find(item => item.id === 'stage');
  const environment = session?.environmentTheme === 'ocean' ? 'OCEAN' : session?.environmentTheme === 'space' ? 'SPACE' : null;
  const StatusIcon = complete ? Check : CircleStop;
  return <ResultV2Frame theme={theme} reason={vm.reason} layout="time-v2">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>ACTION MOVE <span>활동 돌아보기</span></p>
        <h1>{complete ? '오늘의 움직임을 마쳤어요.' : stopped ? '여기까지 함께 움직였어요.' : vm.reason === 'cancelled' ? '이번 활동은 취소되었어요.' : '활동 실행을 확인해 주세요.'}</h1>
        <p className={styles.lead}>{student?.name ? `${student.name} · ` : ''}화면의 신호를 몸으로 연결한 시간을 돌아보세요.</p>
      </div><span className={styles.status} data-complete={complete}><StatusIcon size={16} aria-hidden />{status}</span>
    </header>
    <div className={styles.grid}>
      <section className={styles.record} aria-labelledby="action-move-record">
        <div className={styles.sectionHeading}><h2 id="action-move-record">이번 활동의 기록</h2><span>실제 진행 기록</span></div>
        <div className={styles.time}><span className={styles.timeIcon}><Timer size={30} aria-hidden /></span><div><p>활동 시간</p><strong>{vm.elapsed}</strong><span>시작부터 종료까지의 실행 기록</span></div></div>
        <ol className={styles.journey} aria-label="활동 시작과 종료"><li><span className={styles.dot} /><div><strong>활동 시작</strong><p>움직임 신호 따라가기</p></div></li><li><StatusIcon size={18} aria-hidden /><div><strong>{status}</strong><p>{complete ? '설정한 활동을 마쳤어요.' : stopped ? '진행 중 활동을 종료했어요.' : '종료 전까지의 기록이에요.'}</p></div></li></ol>
        <p className={styles.note}>동작별 수행 횟수와 정확도는 자동 측정하지 않습니다.</p>
        <section className={styles.config} aria-labelledby="action-move-config"><div className={styles.sectionHeading}><h3 id="action-move-config">사용한 활동 구성</h3><span>수행 결과가 아닌 설정</span></div>
          <ul className={styles.chips}>{actions.length ? actions.map(label => { const text = label === '뻗기' ? '연속 타격' : label; const Icon = icons[text as keyof typeof icons] ?? MoveRight; return <li key={label}><Icon size={16} aria-hidden />{text}</li>; }) : <li>동작 설정 미전달</li>}</ul>
          <div className={styles.settings}>{stage ? <span>단계당 <strong>{stage.value}</strong></span> : null}{environment ? <span>환경 <strong>{environment}</strong></span> : null}{configured.includes('보너스') ? <span><Sparkles size={14} aria-hidden />보너스 포함</span> : null}</div>
          <p>선택한 동작 목록이며, 각 동작의 실제 진행 여부를 뜻하지 않습니다.</p>
        </section>
      </section>
      <aside className={styles.reflection} aria-labelledby="action-move-reflection"><p className={styles.eyebrow}>수업 마무리</p><h2 id="action-move-reflection">움직임을 말로<br />연결해 봐요.</h2><p className={styles.lead}>정답을 찾기보다, 몸으로 느낀 것을 함께 이야기해 주세요.</p>
        <div className={styles.question}><span>01 · 아이에게 물어보기</span><h3>어떤 동작으로 바뀔 때<br />가장 집중했나요?</h3><p>기억나는 신호와 그때 했던 움직임을 말해 보세요.</p></div>
        <div className={styles.question}><span>02 · 함께 돌아보기</span><h3>다음 동작을 준비할 때<br />몸을 어떻게 바꿨나요?</h3><p>발의 위치, 몸의 높이, 균형 중 기억나는 것을 골라 보세요.</p></div>
        <div className={styles.next}><strong>다음 활동에서는</strong><p>어려웠던 동작 하나를 골라 천천히 연습한 뒤 다시 연결해 보세요.</p></div>
      </aside>
    </div>
    <ResultV2Actions onBack={onBack} onRetry={onRetry} additionalActions={resultActions} notice={resultNotice} footer={footer} />
  </ResultV2Frame>;
}
