'use client';

import { useEffect, useState } from 'react';

export function EducationFloatingCTA() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const contact = document.getElementById('contact');
    if (!contact) return;
    let contactVisible = false;
    const update = () => setVisible(window.scrollY > 500 && !contactVisible);
    const observer = new IntersectionObserver(([entry]) => {
      contactVisible = entry.isIntersecting;
      update();
    });
    observer.observe(contact);
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); window.removeEventListener('scroll', update); };
  }, []);
  return <div className="web-education-floating-cta" hidden={!visible}><p>우리 기관에 맞는 체육수업이 궁금하신가요?</p><a href="#inquiry">기관 수업 문의하기</a></div>;
}
