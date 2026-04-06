'use client';

import { useEffect, useState } from 'react';
import Header from './Header';
import Hero from './Hero';
import TrustAssetsBar from './TrustAssetsBar';
import TargetAudience from './TargetAudience';
import Reviews from './Reviews';
import Pricing from './Pricing';
import ContactForm from './ContactForm';
import FAQ from './FAQ';
import Footer from './Footer';
import { GYM_CONFIG } from '../data/config';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function GymLandingClient() {
  const [showMobileCta, setShowMobileCta] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('.gym-hero');
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowMobileCta(!entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="gym-landing">
      <Header />
      <main id="top">
        <Hero />
        <TargetAudience />
        <Reviews />
        <TrustAssetsBar />
        <Pricing />
        <FAQ />
        <ContactForm />
        <Footer />
      </main>

      {/* CTA bar (mobile) */}
      <div className={`gym-cta-bar ${showMobileCta ? 'show' : ''}`} aria-label="빠른 문의">
        <a className="gym-btn ghost" href={`tel:${GYM_CONFIG.phoneParts.join('')}`} aria-label="전화 문의">
          전화
        </a>
        <button type="button" className="gym-btn ghost" onClick={() => window.open(GYM_CONFIG.kakao.webUrl, '_blank')} aria-label="카카오 채널 문의">
          카카오
        </button>
        <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
          체험 수업 신청
        </button>
      </div>
    </div>
  );
}
