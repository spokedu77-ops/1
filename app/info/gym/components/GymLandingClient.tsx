'use client';

import Header from './Header';
import Hero from './Hero';
import Intro from './Intro';
import TargetAudience from './TargetAudience';
import Curriculum from './Curriculum';
import Instructors from './Instructors';
import InstructorPhotos from './InstructorPhotos';
import Media from './Media';
import Schedule from './Schedule';
import Pricing from './Pricing';
import Report from './Report';
import Reviews from './Reviews';
import FAQ from './FAQ';
import Location from './Location';
import Parking from './Parking';
import ContactForm from './ContactForm';
import Footer from './Footer';
import { GYM_CONFIG } from '../data/config';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function GymLandingClient() {
  return (
    <div className="gym-landing">
      <Header />
      <main id="top">
        <Hero />
        <Intro />
        <TargetAudience />
        <Curriculum />
        <Instructors />
        <InstructorPhotos />
        <Media />
        <Schedule />
        <Pricing />
        <Report />
        <Reviews />
        <FAQ />
        <Location />
        <Parking />
        <ContactForm />
      </main>
      <Footer />

      {/* CTA bar (mobile) */}
      <div className="gym-cta-bar" aria-label="빠른 문의">
        <a className="gym-btn ghost" href={`tel:${GYM_CONFIG.phoneParts.join('')}`} aria-label="전화 문의">
          전화
        </a>
        <button type="button" className="gym-btn ghost" onClick={() => window.open(GYM_CONFIG.kakao.webUrl, '_blank')} aria-label="카카오 채널 문의">
          카카오
        </button>
        <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
          상담 신청
        </button>
      </div>
    </div>
  );
}
