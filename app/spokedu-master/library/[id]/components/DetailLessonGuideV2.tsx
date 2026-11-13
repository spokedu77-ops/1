'use client';

import { ArrowRight, CheckCircle2, Info, MapPin, MessageSquareQuote, Package, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode, Ref } from 'react';
import type { LessonDisplayModel } from '../../../lib/lessonDisplayModel';
import { nextImageUnoptimized } from '../../../lib/mediaPreferences';
import type { RelatedLessonVideo } from '../../relatedLessonVideos';
import { LessonVideo, SetupImage, splitCoachScriptParagraphs, splitLessonTitle, type VideoProps } from './DetailLessonGuide';
import styles from './DetailLessonGuideV2.module.css';

// Only this registered explanation has an explicitly approved presentation classification.
const SWITCH_RUNNING_PROGRAM_ID = '198';

// Presentation-only classification of the pilot's registered explanation.
// Other entries retain their original order and are never inferred from position.
const PILOT_VARIATION_EXPERIENCE = '동작별로 이동 방향과 신체 사용 방법이 달라져 민첩성, 균형감각, 하체 협응력, 신체 조절 능력을 다양하게 높일 수 있습니다.';

export function DetailLessonGuideV2({ model, actions, video, relatedVideos, personalizedContext, heroTitleRef, libraryHref }: {
  model: LessonDisplayModel;
  actions: ReactNode;
  video: VideoProps;
  relatedVideos: RelatedLessonVideo[];
  personalizedContext?: ReactNode;
  heroTitleRef?: Ref<HTMLHeadingElement>;
  libraryHref: string;
}) {
  const title = splitLessonTitle(model.title);
  const hasVideo = Boolean(video.embedUrl || video.directUrl || video.externalUrl);
  const hasSetup = Boolean(model.setupImageUrl || model.equipment.length || model.setupNotes.length || model.safetyNotes.length);
  const hasGuide = Boolean(model.coachScript || model.briefingNotes.length || model.fieldTips.length);
  const experience = model.id === SWITCH_RUNNING_PROGRAM_ID
    ? model.variationMethod.find(item => item === PILOT_VARIATION_EXPERIENCE) : undefined;
  const variations = model.variationMethod.filter(item => item !== experience);
  const scriptParagraphs = splitCoachScriptParagraphs(model.coachScript);
  const trimmedScript = model.coachScript.trim();
  const scriptAlreadyQuoted = /^(?:“[\s\S]*”|"[\s\S]*"|「[\s\S]*」|『[\s\S]*』)$/.test(trimmedScript);

  return (
    <div className={styles.root} data-library-detail-v2>
      <header className={styles.summary}>
        <div className={styles.introduction}>
          <div className={styles.badges}>
            <span className={styles.categoryBadge}>놀이체육</span>
            {model.target ? <span className={styles.targetBadge}>{model.target}</span> : null}
            {model.functions.length ? <span className={styles.functionBadge}>{model.functions.join(' · ')}</span> : null}
            {model.tags.map(tag => <span key={tag}>{tag}</span>)}
          </div>
          <h1 ref={heroTitleRef} className={styles.title}><span>{title.koreanTitle}</span>{title.englishTitle ? <small>{title.englishTitle}</small> : null}</h1>
          {model.description ? <p className={styles.description}>{model.description}</p> : null}
          {model.objective ? <p className={styles.objective}>{model.objective}</p> : null}
        </div>
        <div className={styles.actions}>{actions}</div>
        <dl className={styles.meta}>
          {model.participantFormat ? <div><Users aria-hidden="true" /><div><dt>인원 및 대형</dt><dd>{model.participantFormat}</dd></div></div> : null}
          {model.equipment.length ? <div><Package aria-hidden="true" /><div><dt>준비 교구</dt><dd>{model.equipment.join(', ')}</dd></div></div> : null}
          {model.space ? <div><MapPin aria-hidden="true" /><div><dt>활동 공간</dt><dd>{model.space}</dd></div></div> : null}
        </dl>
      </header>

      <div className={styles.columns}>
        {hasVideo || hasSetup ? <div className={styles.leftColumn}>
          {hasVideo ? <section id="lesson-video" className={styles.video} data-v2-card="video" aria-label="활동 시범 영상">
            <LessonVideo model={model} video={video} preserveVideoRatio />
          </section> : null}
          {hasSetup ? <article className={`${styles.card} ${styles.setup}`} data-v2-card="setup" data-v2-group="setup">
            <div className={styles.setupHeading}><h2>교구 준비 및 활동 배치</h2></div>
            <div className={styles.setupBody}>
              {model.setupImageUrl ? <div className={styles.setupImage}><SetupImage title={model.title} src={model.setupImageUrl} /></div> : null}
              {model.equipment.length ? <section className={styles.equipment} aria-label="준비 교구">{model.equipment.map(item => <div key={item}><Package /><p>{item}</p></div>)}</section> : null}
              {model.setupNotes.length ? <section className={styles.checks}><h3>수업 준비 확인</h3>{model.setupNotes.map((item, i) => <p key={i}><CheckCircle2 />{item}</p>)}</section> : null}
              {model.safetyNotes.length ? <section className={styles.safety}><h3>준비 및 안전</h3>{model.safetyNotes.map((item, i) => <p key={i}>{item}</p>)}</section> : null}
            </div>
          </article> : null}
        </div> : null}
        {model.activityMethod.length || model.variationMethod.length || hasGuide ? <div className={styles.rightColumn}>
          {model.activityMethod.length ? <section className={`${styles.card} ${styles.method}`} data-v2-card="method">
            <h2 className={styles.sectionHeading}>활동 방법</h2>
            <ol className={styles.steps}>{model.activityMethod.map((item, i) => <li key={i}><span className={styles.number}>{i + 1}</span><p>{item}</p></li>)}</ol>
          </section> : null}
          {model.variationMethod.length ? <section className={`${styles.card} ${styles.variations}`} data-v2-card="variations">
            <h2 className={styles.sectionHeading}>활동 변형 방법</h2>
            {variations.length ? <div className={styles.variationGrid}>{variations.map((item, i) => <div className={variations.length === 1 ? styles.variationProse : styles.variationItem} key={i}>{variations.length > 1 ? <span className={styles.variationMark} aria-hidden="true"><ArrowRight /></span> : null}<p>{item}</p></div>)}</div> : null}
            {experience ? <aside className={styles.experience}><Info aria-hidden="true" /><div><h3>교육적 경험</h3><p>{experience}</p></div></aside> : null}
          </section> : null}
          {hasGuide ? <section className={`${styles.card} ${styles.guidance}`} data-v2-card="guidance">
            <h2 className={styles.sectionHeading}>현장 지도 가이드</h2>
            {model.coachScript ? <section className={styles.script}>
              <h3><MessageSquareQuote aria-hidden="true" />수업 도입 안내</h3>
              <div className={styles.speechTurn}>
                <blockquote className={styles.speechBubble}>
                  <q data-existing-quotes={scriptAlreadyQuoted || undefined}>{scriptParagraphs.map((text, i) => <span className={styles.scriptParagraph} key={i}>{i > 0 ? '\n\n' : null}{text}</span>)}</q>
                </blockquote>
              </div>
            </section> : null}
            {model.fieldTips.length ? <section className={styles.coaching}><h3>활동 중 지도 언어</h3>{model.fieldTips.map((item, i) => <p key={i}>{item}</p>)}</section> : null}
            {model.briefingNotes.length ? <section className={styles.briefing}><h3>활동 전 확인 사항</h3><ol>{model.briefingNotes.map((item, i) => <li key={i}><span>{i + 1}</span><p>{item}</p></li>)}</ol></section> : null}
          </section> : null}
        </div> : null}
      </div>
      {personalizedContext ? <div className={styles.memory}>{personalizedContext}</div> : null}
      {relatedVideos.length ? <section className={styles.related} data-v2-related>
        <div className={styles.relatedHeading}><div><h2>함께 활용하면 좋은 활동</h2><p>움직임의 특성과 사용 교구를 고려한 연계 활동입니다.</p></div><Link href={libraryHref}>놀이체육 목록 보기 <ArrowRight /></Link></div>
        <div className={styles.relatedGrid}>{relatedVideos.map(item => <Link key={item.id} href={item.href} className={styles.relatedCard}>
          <div className={styles.thumbnail}>{item.thumbnailUrl ? <Image src={item.thumbnailUrl} alt="" fill sizes="(min-width: 1024px) 380px, 100vw" className="object-cover" unoptimized={item.thumbnailUrl.includes('img.youtube.com') || nextImageUnoptimized(item.thumbnailUrl)} /> : null}<span><ArrowRight aria-hidden="true" /></span></div>
          <div className={styles.relatedBody}><p>{item.reason}</p><h3>{item.title}</h3></div>
        </Link>)}</div>
      </section> : null}
    </div>
  );
}
