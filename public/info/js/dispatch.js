/**
 * SPOKEDU 파견 랜딩 페이지 스크립트
 * /info/dispatch.html
 */

(function () {
  'use strict';

  var compareRows = [
    ['핵심 커리큘럼', '강사 개인의 경험 및 재량에 의존', '연세대 연구진이 검증한 자체 연간 커리큘럼 적용'],
    ['강사 파견 기준', '검증 이력 없는 단기 프리랜서 혼용', '체계적 교육과 커리큘럼을 이수한 검증 강사·디렉터'],
    ['결근·펑크 리스크', '기관 원장님과 교사가 직접 대타 해결', '부재 시 즉시 공유 후 대체 강사 투입으로 공백 최소화'],
    ['수업 진행 방식', '단순 기구 놀이 및 시간 채우기식 체육', '아이들의 자발적 몰입을 이끄는 인터랙티브 웜업'],
    ['기관 제공 데이터', '전무함 (구두 전달 수준)', '참여도 및 신체 성장 지표를 분석한 월간 리포트 발송'],
  ];

  var processSteps = [
    { n: '01', icon: 'message-square', title: '상담 및 접수', desc: '웹사이트 폼, 전화 또는 카카오 채널로 파견 문의를 접수합니다.', duration: '당일~24시간' },
    { n: '02', icon: 'search', title: '기관 환경 분석', desc: '대상 연령, 인원, 특이사항을 파악해 기관에 맞는 제안서를 발송합니다.', duration: '1~2일' },
    { n: '03', icon: 'file-signature', title: '일정·조건 협의', desc: '파견 일정과 수업 구성 등을 협의하고 진행 방식을 확정합니다.', duration: '1~3일' },
    { n: '04', icon: 'user-check', title: '전담 강사·디렉터 배정', desc: '기관의 성향과 목표에 맞는 검증된 강사·디렉터를 매칭합니다.', duration: '3~5일' },
    { n: '05', icon: 'play-circle', title: '첫 수업 개시', desc: '기관 담당자와 사전 오리엔테이션 후, 첫 수업을 시작합니다.', duration: '7일 이내' },
  ];

  var faqs = [
    { q: '비용은 어떻게 되나요?', a: '기관 규모, 대상 연령, 파견 횟수에 따라 달라집니다. 제안서 신청 후 맞춤 견적을 안내드립니다.' },
    { q: '최소 계약 기간이 있나요?', a: '학기 단위(3개월)부터 운영 가능합니다. 단기 이벤트는 1회부터 가능합니다.' },
    { q: '강사 교체 요청이 가능한가요?', a: '네, 담당 매니저를 통해 언제든 요청 가능합니다.' },
    { q: '특수학급 아동이 포함된 통합반도 운영되나요?', a: '장애인 스포츠 지도사 자격을 보유한 특수 체육 전문 디렉터를 별도 배정합니다.' },
    { q: '운영 가능한 지역이 어디인가요?', a: '현재 서울 및 수도권 근교 지역에서 운영 중입니다. 운영 가능 여부는 문의 시 확인해 드립니다.' },
  ];

  var programs = ['유아 놀이 체육', '학교 스포츠·방과후', '특수·통합 체육', '운동회·단기 이벤트'];

  function renderCompareTable() {
    var container = document.getElementById('dispatch-compare-rows');
    if (!container) return;
    compareRows.forEach(function (row, i) {
      var div = document.createElement('div');
      div.className = 'dispatch-compare-row grid grid-cols-3 text-sm transition-colors';
      div.style.backgroundColor = i % 2 === 0 ? '' : 'rgba(255,255,255,.015)';
      div.innerHTML =
        '<div class="p-4 sm:p-5 text-slate-300 font-bold border-t" style="border-color:var(--border)">' +
        row[0] +
        '</div>' +
        '<div class="p-4 sm:p-5 text-slate-500 border-l border-t leading-relaxed flex items-start sm:items-center gap-2" style="border-color:var(--border)">' +
        '<i data-lucide="x-circle" class="mt-0.5 sm:mt-0 shrink-0" style="width:16px;height:16px;color:#64748b"></i>' +
        row[1] +
        '</div>' +
        '<div class="p-4 sm:p-5 text-sky-300 font-bold flex items-start sm:items-center gap-2 border-l border-t leading-relaxed" style="border-color:var(--border);background:rgba(56,189,248,.04)">' +
        '<i data-lucide="check-circle-2" class="mt-0.5 sm:mt-0 shrink-0" style="width:16px;height:16px;color:#38bdf8"></i>' +
        row[2] +
        '</div>';
      container.appendChild(div);
    });
  }

  function renderProcessSteps() {
    var container = document.getElementById('dispatch-process-steps');
    if (!container) return;
    processSteps.forEach(function (step, i) {
      var div = document.createElement('div');
      div.className = 'dispatch-glass-card p-6 text-center relative group';
      var arrow =
        i < processSteps.length - 1
          ? '<div class="hidden md:block absolute top-1/2 -right-3 z-10"><i data-lucide="chevron-right" style="width:20px;height:20px;color:#334155"></i></div>'
          : '';
      var duration = step.duration
        ? '<div class="dispatch-process-duration"><i data-lucide="clock-3" style="width:14px;height:14px"></i>' + step.duration + '</div>'
        : '';
      div.innerHTML =
        '<div class="text-xs font-black mb-3" style="color:rgba(56,189,248,.5);letter-spacing:.1em">' +
        step.n +
        '</div>' +
        '<div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110" style="background:rgba(56,189,248,.12)">' +
        '<i data-lucide="' +
        step.icon +
        '" style="width:22px;height:22px;color:#38bdf8"></i></div>' +
        '<h3 class="font-black text-white text-lg mb-2">' +
        step.title +
        '</h3>' +
        '<p class="text-slate-400 text-xs leading-relaxed break-keep">' +
        step.desc +
        '</p>' +
        duration +
        arrow;
      container.appendChild(div);
    });
  }

  function renderFaq() {
    var container = document.getElementById('dispatch-faq-list');
    if (!container) return;
    faqs.forEach(function (f) {
      var details = document.createElement('details');
      details.className = 'dispatch-faq-item dispatch-glass-card overflow-hidden transition-all duration-300';
      details.innerHTML =
        '<summary class="flex items-center justify-between p-6 gap-4 outline-none hover:bg-slate-800/30">' +
        '<span class="font-bold text-white leading-relaxed text-sm sm:text-base">' +
        f.q +
        '</span>' +
        '<span class="dispatch-faq-icon shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style="background:rgba(56,189,248,.12);color:#38bdf8">' +
        '<i data-lucide="plus" style="width:16px;height:16px"></i></span>' +
        '</summary>' +
        '<div class="dispatch-faq-body px-6 pb-6">' +
        '<div class="dispatch-divider mb-5"></div>' +
        '<p class="text-slate-300 leading-relaxed text-sm break-keep">' +
        f.a +
        '</p></div>';
      container.appendChild(details);
    });
  }

  function renderProgramCheckboxes() {
    var container = document.getElementById('dispatch-program-checkboxes');
    if (!container) return;
    programs.forEach(function (p) {
      var label = document.createElement('label');
      label.className = 'flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white transition';
      label.style.cssText =
        'padding:.75rem .75rem; border:1px solid var(--border); border-radius:.5rem; background:rgba(255,255,255,.03)';
      label.innerHTML = '<input type="checkbox" class="accent-sky-400" style="width:16px;height:16px"> <span class="truncate">' + p + '</span>';
      container.appendChild(label);
    });
  }

  function initReveal() {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('active');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.dispatch-reveal').forEach(function (el) {
      observer.observe(el);
    });
  }

  function initNavbarScroll() {
    var navbar = document.getElementById('dispatch-navbar');
    var floatingCta = document.getElementById('dispatch-floating-cta');
    if (!navbar || !floatingCta) return;
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
      floatingCta.classList.toggle('visible', window.scrollY > 600);
    });
  }

  function initContactForm() {
    var form = document.getElementById('dispatch-contact-form');
    var toast = document.getElementById('dispatch-toast');
    if (!form || !toast) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      toast.classList.add('show');
      setTimeout(function () {
        toast.classList.remove('show');
      }, 4000);
      form.reset();
    });
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function init() {
    renderCompareTable();
    renderProcessSteps();
    renderFaq();
    renderProgramCheckboxes();

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }

    initReveal();
    initNavbarScroll();
    initContactForm();
    initSmoothScroll();

    // Re-run lucide after dynamic content
    setTimeout(function () {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
