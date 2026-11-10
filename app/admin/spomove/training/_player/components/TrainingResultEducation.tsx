import type { ResultEducation } from '../lib/trainingResultEducation';
import styles from './TrainingResultScreen.module.css';

export function TrainingResultEducation({ feedback }: { feedback: ResultEducation }) {
  return <div className={styles.educationalFeedback} data-education-profile={feedback.profileId}>
    <section className={styles.feedbackIntro} aria-labelledby="tr-feedback-about">
      <h3 id="tr-feedback-about">어떤 활동인가요?</h3>
      <p>{feedback.description}</p>
    </section>
    <section className={styles.feedbackExperiences} aria-labelledby="tr-feedback-experiences">
      <h3 id="tr-feedback-experiences">이번 활동의 핵심 경험</h3>
      <dl>{feedback.experiences.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.description}</dd></div>)}</dl>
    </section>
    <section className={styles.feedbackGuidance} aria-labelledby="tr-feedback-next">
      <h3 id="tr-feedback-next">다음 활동에서 살펴볼 점</h3>
      <p>{feedback.tip}</p>
    </section>
    <p className={styles.feedbackDisclaimer}>교육적 목표와 지도 방법에 관한 안내이며, 아동의 수행 성과를 평가한 내용은 아닙니다.</p>
  </div>;
}
