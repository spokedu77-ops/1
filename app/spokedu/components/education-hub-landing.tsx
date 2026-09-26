"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteFooter } from "./home-web/site-footer";
import { SiteHeader } from "./home-web/site-header";
import styles from "./education-hub.module.css";

const CONDITIONS = [
  [
    "01",
    "공간",
    "교실, 활동실, 강당, 체육관 등 사용 가능한 공간에 맞춰 이동 동선과 교구 구성을 조정합니다.",
  ],
  [
    "02",
    "인원",
    "소그룹부터 반 단위, 다인원 활동까지 인원에 맞춰 대기와 참여 구조를 설계합니다.",
  ],
  [
    "03",
    "연령",
    "유아, 초등, 청소년과 특수·통합 환경까지 수행 수준과 이해 속도에 맞게 규칙을 조정합니다.",
  ],
  [
    "04",
    "운영",
    "정규수업, 방학특강, 원데이, 행사 등 회기와 목적에 맞춰 프로그램을 구성합니다.",
  ],
] as const;

const FLOW = [
  [
    "01",
    "이동운동기술",
    "기본 움직임과 신체조절을 바탕으로 안정적인 움직임을 준비합니다.",
    "/images/spokedu/records/gangdong-health-pe.jpg",
  ],
  [
    "02",
    "스포무브: 시지각 움직임 놀이체육",
    "화면의 정보를 보고 판단한 뒤 움직임으로 반응합니다.",
    "/images/spokedu/programs/program-spomove.jpg",
  ],
  [
    "03",
    "조작운동기술",
    "던지기, 받기, 차기, 타격 등 다양한 교구를 활용해 움직임 기술을 확장합니다.",
    "/images/spokedu/private/private-tool-activity.jpg",
  ],
  [
    "04",
    "팀 활동",
    "협동과 규칙 이해를 바탕으로 팀 게임과 스포츠 활동으로 연결합니다.",
    "/images/spokedu/records/maedong-sports-stepup.jpg",
  ],
] as const;

const FORMATS = [
  [
    "01",
    "정기수업",
    "주 1회 또는 정해진 회기에 맞춰 연속적인 커리큘럼으로 운영합니다.",
  ],
  [
    "02",
    "방학·특강",
    "방학 또는 특정 기간에 맞춰 스포츠와 놀이체육을 집중적으로 구성합니다.",
  ],
  [
    "03",
    "원데이·행사",
    "가족체육, 미니운동회, 체험 프로그램 등 짧은 시간 안에 참여도가 높은 프로그램을 운영합니다.",
  ],
  [
    "04",
    "특수·포용 체육",
    "참여자의 수행 수준과 특성에 맞춰 속도, 규칙, 거리, 교구와 촉진 수준을 조정합니다.",
  ],
] as const;

const CONTENT = [
  [
    "01",
    "FUNCTIONAL MOVE",
    "기초 움직임과 신체조절",
    "/images/spokedu/programs/program-paps-running.jpg",
  ],
  [
    "02",
    "TEAM BUILDING",
    "협동과 규칙 이해",
    "/images/spokedu/records/maedong-sports-stepup.jpg",
  ],
  [
    "03",
    "SPOMOVE",
    "시지각과 움직임 반응",
    "/images/spokedu/records/dongjak-spomove.jpg",
  ],
  [
    "04",
    "MONTHLY SPORTS",
    "종목별 스포츠 경험",
    "/images/spokedu/private/curriculum-basketball.jpg",
  ],
  [
    "05",
    "MINI OLYMPICS",
    "팀 경기와 이벤트",
    "/images/spokedu/dispatch/dispatch-oneday-event.jpg",
  ],
  [
    "06",
    "CUSTOM",
    "기관 목적에 맞춘 프로그램",
    "/images/spokedu/dispatch/dispatch-institution-class.jpg",
  ],
] as const;

const CASES = [
  [
    "매동초등학교",
    "학교 · 정기수업",
    "학년과 인원에 맞춰 종목을 순환하며 연속적인 스포츠 수업을 운영했습니다.",
    "/images/spokedu/records/maedong-sports-stepup.jpg",
    "https://blog.naver.com/spokedutogether/224288711414",
  ],
  [
    "서울 중구 찾아가는 동행 체육교실",
    "특수·통합 · 정기수업",
    "참여자의 수행 수준에 따라 거리, 속도, 규칙과 촉진 수준을 조정했습니다.",
    "/images/spokedu/records/donghaeng-special-pe-field.jpg",
    "https://blog.naver.com/spokedutogether/224338186918",
  ],
  [
    "동작거점형 우리동네키움센터",
    "기관 · SPOMOVE",
    "화면 자극과 실제 움직임을 연결해 인지와 움직임을 함께 경험하도록 구성했습니다.",
    "/images/spokedu/records/dongjak-spomove.jpg",
    "/records/dongjak-spomove",
  ],
] as const;

const FAQ = [
  [
    "수업 비용은 어떻게 정해지나요?",
    "대상, 인원, 회기, 수업시간, 지역과 필요한 교구에 따라 달라집니다. 조건을 확인한 뒤 운영안과 함께 안내드립니다.",
  ],
  [
    "최소 몇 회부터 가능한가요?",
    "원데이부터 정기수업까지 운영 가능하며 목적에 따라 적합한 회기 구성을 제안합니다.",
  ],
  [
    "기관에서 교구를 준비해야 하나요?",
    "프로그램에 필요한 교구는 운영 방식에 따라 협의하며 SPOKEDU가 준비해 진행할 수 있습니다.",
  ],
  [
    "특수·통합 환경에서도 가능한가요?",
    "가능합니다. 참여자의 수행 수준과 특성에 맞춰 규칙, 거리, 속도와 촉진 수준을 조정합니다.",
  ],
  [
    "어느 지역까지 운영하나요?",
    "수업 지역과 일정에 따라 운영 가능 여부가 달라질 수 있으므로 문의 시 기관 위치를 함께 알려주세요.",
  ],
] as const;

export function EducationHubLanding() {
  const [activeContent, setActiveContent] = useState(0);
  const [openFaqs, setOpenFaqs] = useState<boolean[]>(() =>
    FAQ.map(() => false),
  );
  const selectedContent = CONTENT[activeContent];

  const toggleFaq = (index: number) => {
    setOpenFaqs((current) =>
      current.map((isOpen, itemIndex) =>
        itemIndex === index ? !isOpen : isOpen,
      ),
    );
  };

  return (
    <div className={styles.page} data-education-p0="desktop-static">
      <SiteHeader />
      <main>
        <section className={styles.hero} aria-labelledby="edu-hero">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.label}>기관 · 학교 체육수업</p>
              <h1 id="edu-hero">
                <span>기관의 환경에 맞춰</span>
                <span>체육수업을 설계합니다.</span>
              </h1>
              <p className={styles.lead}>
                학교와 기관의 대상, 인원, 공간과 일정에 맞춰
                <br />
                SPOKEDU가 직접 수업을 설계하고 운영합니다.
              </p>
              <div className={styles.actions}>
                <Link className={styles.primary} href="/contact">
                  수업 문의하기
                </Link>
                <Link className={styles.secondary} href="/records">
                  운영 사례 보기
                </Link>
              </div>
            </div>
            <div className={styles.heroImage}>
              <img
                src="/images/spokedu/dispatch/dispatch-institution-class.jpg"
                alt="지도자와 여러 아동이 스포츠 교구를 활용해 움직이는 기관 체육수업"
              />
            </div>
          </div>
        </section>

        <section className={styles.conditions} aria-labelledby="edu-conditions">
          <div className={styles.grid}>
            <header>
              <h2 id="edu-conditions">
                조건이 달라지면
                <br />
                수업도 달라집니다.
              </h2>
              <p>
                같은 프로그램을 모든 현장에 반복하지 않습니다.
                <br />
                공간과 인원, 연령과 운영 목적에 맞춰
                <br />
                수업의 구성과 진행 방식을 조정합니다.
              </p>
            </header>
            <div className={styles.rows}>
              {CONDITIONS.map(([n, title, body]) => (
                <article key={n}>
                  <span>{n}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.flow} aria-labelledby="edu-flow">
          <div className={styles.rail}>
            <header className={styles.sectionHead}>
              <h2 id="edu-flow">
                하나의 활동이 아니라
                <br />
                수업의 흐름을 설계합니다.
              </h2>
              <p>
                수업 목적과 대상에 따라 구성은 달라지지만 기본적인 움직임에서
                인지·반응, 조작기술과 협동 활동까지 자연스럽게 이어지도록 수업을
                설계합니다.
              </p>
            </header>
            <div className={styles.flowGrid}>
              {FLOW.map(([n, title, body, src]) => (
                <article key={n}>
                  <div>
                    <span>{n}</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                  <img src={src} alt={`${title} 실제 수업 장면`} />
                </article>
              ))}
            </div>
            <p className={styles.note}>
              ※ 대상과 목적에 따라 활동의 순서와 구성은 달라질 수 있으며
              SPOMOVE는 모든 수업에 필수로 포함되는 프로그램이 아닙니다.
            </p>
          </div>
        </section>

        <section className={styles.formats} aria-labelledby="edu-format">
          <div className={styles.grid}>
            <h2 id="edu-format">
              목적에 맞는 방식으로
              <br />
              운영합니다.
            </h2>
            <div className={styles.darkRows}>
              {FORMATS.map(([n, title, body]) => (
                <article key={n}>
                  <span>{n}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.content} aria-labelledby="edu-content">
          <div className={styles.rail}>
            <header className={styles.sectionHead}>
              <h2 id="edu-content">
                수업 목적에 맞춰
                <br />
                활동을 조합합니다.
              </h2>
              <p>
                한 가지 프로그램을 반복하기보다 목적과 대상에 맞는 활동을
                선택하고 조합합니다.
              </p>
            </header>
            <div className={styles.contentGrid}>
              <div className={styles.contentList}>
                {CONTENT.map(([n, title, body], index) => (
                  <button
                    key={n}
                    type={"button"}
                    className={
                      index === activeContent ? styles.contentActive : undefined
                    }
                    aria-pressed={index === activeContent}
                    onMouseEnter={() => setActiveContent(index)}
                    onFocus={() => setActiveContent(index)}
                    onClick={() => setActiveContent(index)}
                  >
                    <span>{n}</span>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </button>
                ))}
              </div>
              <figure className={styles.contentVisual}>
                <img
                  key={selectedContent[3]}
                  src={selectedContent[3]}
                  alt={selectedContent[1] + " 실제 체육수업"}
                />
                <figcaption>
                  <strong>{selectedContent[1]}</strong>
                  <span>{selectedContent[2]}</span>
                </figcaption>
              </figure>
              <img
                src="/images/spokedu/programs/program-paps-running.jpg"
                alt="달리기와 이동운동으로 기초 움직임과 신체조절을 경험하는 실제 체육수업"
              />
            </div>
            <Link className={styles.textLink} href="/spomove">
              SPOMOVE 자세히 보기 →
            </Link>
          </div>
        </section>

        <section className={styles.proof} aria-labelledby="edu-proof">
          <div className={styles.rail}>
            <p className={styles.orangeLabel}>FIELD RECORDS</p>
            <header className={styles.sectionHead}>
              <h2 id="edu-proof">
                같은 수업을
                <br />
                어디에나 반복하지 않습니다.
              </h2>
              <p>
                현장마다 공간과 인원, 참여자의 특성이 다르기 때문에 수업의
                동선과 규칙, 교구와 진행 속도를 함께 조정합니다.
              </p>
            </header>
            <div className={styles.caseLayout}>
              {CASES.map(([title, type, body, src, href], i) => (
                <Link
                  key={title}
                  href={href}
                  className={i === 0 ? styles.caseLarge : styles.caseSmall}
                >
                  <img src={src} alt={`${title} 실제 수업 현장`} />
                  <div>
                    <span>{type}</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                    <b aria-hidden="true">↗</b>
                  </div>
                </Link>
              ))}
            </div>
            <Link className={styles.textLink} href="/records">
              전체 수업사례 보기 →
            </Link>
          </div>
        </section>

        <section className={styles.process} aria-labelledby="edu-process">
          <div className={styles.rail}>
            <div className={styles.processTop}>
              <div>
                <h2 id="edu-process">
                  조건이 아직 정리되지 않아도
                  <br />
                  괜찮습니다.
                </h2>
                <p>
                  기관명과 예상 인원, 희망 일정 정도만 알려주셔도
                  <br />
                  가능한 운영 방식부터 함께 확인합니다.
                </p>
              </div>
              <div className={styles.processRows}>
                {[
                  ["01", "조건 확인", "대상 · 인원 · 공간 · 일정"],
                  ["02", "운영안 구성", "프로그램 · 회기 · 강사 · 교구"],
                  ["03", "현장 운영", "수업 진행 · 현장 조정 · 운영 공유"],
                ].map(([n, t, b]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <strong>{t}</strong>
                    <p>{b}</p>
                  </div>
                ))}
              </div>
              <aside>
                <Link href="/contact">기관 체육수업 문의하기 →</Link>
                <a href="https://pf.kakao.com/_VGWxeb/chat">
                  카카오채널 문의 가능
                </a>
              </aside>
            </div>
            <div className={styles.faq}>
              <h3>자주 묻는 질문</h3>
              {FAQ.map(([q, a], index) => {
                const panelId = "education-faq-panel-" + index;
                const isOpen = openFaqs[index];
                return (
                  <div className={styles.faqItem} key={q}>
                    <button
                      type={"button"}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleFaq(index)}
                    >
                      {q}
                      <span aria-hidden="true">＋</span>
                    </button>
                    <div
                      id={panelId}
                      className={styles.faqPanel}
                      data-open={isOpen ? "true" : "false"}
                      role={"region"}
                      aria-label={q}
                    >
                      <div>
                        <p>{a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
