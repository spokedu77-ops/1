'use client';

import { useEffect, useRef, useState } from 'react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Stats from './components/Stats';
import Vision from './components/Vision';
import CoreValues from './components/CoreValues';
import Program from './components/Program';
import Product from './components/Product';
import Benefits from './components/Benefits';
import Contact from './components/Contact';
import Footer from './components/Footer';

export default function CurriculumLandingClient() {
  const [navScrolled, setNavScrolled] = useState(false);
  const statsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const revealEls = document.querySelectorAll('.curriculum-landing .reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const updateStatsGrid = () => {
      if (!statsGridRef.current) return;
      const w = window.innerWidth;
      (statsGridRef.current as HTMLDivElement).style.gridTemplateColumns =
        w < 640 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';
    };
    updateStatsGrid();
    window.addEventListener('resize', updateStatsGrid);
    return () => window.removeEventListener('resize', updateStatsGrid);
  }, []);

  return (
    <div className="curriculum-landing scroll-smooth">
      <Nav scrolled={navScrolled} />
      <main>
        <Hero />
        <div className="curriculum-section-sep" />
        <Stats statsGridRef={statsGridRef} />
        <div className="curriculum-section-sep" />
        <Vision />
        <div className="curriculum-section-sep" style={{ maxWidth: 1200, margin: '0 auto' }} />
        <CoreValues />
        <div className="curriculum-section-sep" style={{ maxWidth: 1200, margin: '0 auto' }} />
        <Program />
        <div className="curriculum-section-sep" style={{ maxWidth: 1200, margin: '0 auto' }} />
        <Product />
        <div className="curriculum-section-sep" style={{ maxWidth: 1200, margin: '0 auto' }} />
        <Benefits />
        <Contact />
        <div className="curriculum-section-sep" />
        <Footer />
      </main>
    </div>
  );
}
