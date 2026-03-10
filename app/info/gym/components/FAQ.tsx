'use client';

import { useState } from 'react';
import { FAQ_ITEMS } from '../data/config';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="gym-section" aria-labelledby="faqHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">FAQ</div>
          <h2 id="faqHeading" className="gym-section-title">
            자주 묻는 질문
          </h2>
          <p className="gym-section-desc">
            문의에서 자주 나오는 질문만 남기고, 답변은 짧고 명확하게 정리합니다.
          </p>
        </div>
        <div style={{ maxWidth: 720 }}>
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={i}
              style={{
                borderRadius: 12,
                border: '1px solid var(--gym-line)',
                background: 'rgba(255,255,255,.03)',
                marginBottom: 8,
                overflow: 'hidden',
              }}
              open={openIndex === i}
              onToggle={() => setOpenIndex((prev) => (prev === i ? null : i))}
            >
              <summary
                style={{
                  padding: '14px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {item.q}
                <span style={{ color: 'var(--gym-accent)', fontSize: 12 }}>{openIndex === i ? '▲' : '▼'}</span>
              </summary>
              <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--gym-muted)', lineHeight: 1.6 }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
