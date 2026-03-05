'use client';

import { useState } from 'react';
import { FAQ_DATA } from '../data/faq';

function ChevronIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq">
      <div className="pl-container">
        <h2 className="pl-section-title">자주 묻는 질문</h2>
        <p className="pl-lead">상담 전 학부모님들이 주로 궁금해하시는 내용을 정리해 두었습니다.</p>
        <div className="pl-faq-container">
          {FAQ_DATA.map((item, i) => (
            <div
              key={item.q}
              className={`pl-faq-item ${openIndex === i ? 'open' : ''}`}
            >
              <button
                type="button"
                className="pl-faq-q"
                aria-expanded={openIndex === i}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span>{item.q}</span>
                <ChevronIcon />
              </button>
              <div className="pl-faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
