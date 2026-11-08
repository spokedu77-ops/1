import Image from 'next/image';
import { aboutPage } from '../../data/about-page';
import '../styles/about-people.css';

export function AboutPeopleCards() {
  return <div className="web-card-grid web-about-people-grid">
      {aboutPage.team.members.map(person => <article className="web-about-person-card" key={person.id}>
        <div className="web-about-person-photo">
          <Image unoptimized src={person.photo} alt={`${person.name} ${person.role}`} width={1200} height={1500} sizes="(max-width: 767px) calc(100vw - 88px), (max-width: 1279px) 30vw, 350px" loading="lazy" style={{ objectPosition: person.photoObjectPosition, transform: `scale(${person.photoScale})` }} />
        </div>
        <div className="web-about-person-info">
          <p className="web-about-person-role">{person.role}</p>
          <h3>{person.name}</h3>
          <p className="web-about-person-degree">{person.degree}</p>
          <p className="web-about-person-responsibility">{person.mainRole}</p>
          <details className="web-about-person-details">
            <summary><span className="web-about-person-expand-label">상세 약력 보기</span><span className="web-about-person-collapse-label">상세 약력 접기</span><span className="sr-only"> — {person.name}</span><span className="web-about-person-chevron" aria-hidden="true">⌄</span></summary>
            <div className="web-about-person-biography">
              <section><h4>학력</h4><p>{person.detailEducation}</p></section>
              {person.qualifications.length > 0 && <section><h4>자격</h4><ul>{person.qualifications.map(item => <li key={item}>{item}</li>)}</ul></section>}
              {person.experience.length > 0 && <section><h4>주요 경력 및 활동</h4><ul>{person.experience.map(item => <li key={item}>{item}</li>)}</ul></section>}
            </div>
          </details>
        </div>
      </article>)}
    </div>;
}
