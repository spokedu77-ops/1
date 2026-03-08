/**
 * SPOKEDU 파견 랜딩 페이지 스크립트
 * /info/dispatch.html
 */

(function () {
  'use strict';

  var compareRows = [
    ['핵심 커리큘럼', '강사 개인의 경험 및 재량에 의존', '연세대 연구진이 검증한 자체 연간 커리큘럼 적용'],
    ['강사 파견 기준', '검증되지 않은 단기 프리랜서·알바 혼용', '내부 혹독한 교육을 이수한 100% 본사 직영 디렉터'],
    ['결근·펑크 리스크', '기관 원장님과 교사가 직접 대타 해결', '본사 통제 하에 즉시 대체 디렉터 100% 투입 보장'],
    ['수업 진행 방식', '단순 기구 놀이 및 시간 채우기식 체육', '아이들의 자발적 몰입을 이끄는 인터랙티브 웜업'],
    ['기관 제공 데이터', '전무함 (구두 전달 수준)', '참여도 및 신체 성장 지표를 분석한 월간 리포트 발송'],
    ['계약 및 보험', '불명확한 개인 거래 리스크 존재', '투명한 표준 계약서 및 영업배상책임보험 전면 가입'],
  ];

  var processSteps = [
    { n: '01', icon: 'message-square', title: '상담 및 접수', desc: '웹사이트 폼 작성, 전화 또는 채널을 통해 파견 문의를 접수합니다.' },
    { n: '02', icon: 'search', title: '기관 환경 분석', desc: '대상 연령, 인원, 특이사항을 파악하여 기관에 꼭 맞는 제안서를 발송합니다.' },
    { n: '03', icon: 'file-signature', title: '제휴 계약 체결', desc: '투명한 표준 계약서를 검토하고 서명하며, 파견 일정을 확정합니다.' },
    { n: '04', icon: 'user-check', title: '전담 디렉터 배정', desc: '해당 기관의 성향과 목표에 최적화된 전문 직영 디렉터를 매칭합니다.' },
    { n: '05', icon: 'play-circle', title: '첫 수업 개시', desc: '기관 담당자와의 사전 오리엔테이션 후, 압도적인 첫 수업을 시작합니다.' },
  ];

  var faqs = [
    { q: '체육 강사가 갑자기 안 나오는 등 결근 문제가 잦았는데, 스포키듀는 어떤가요?', a: '가장 자신 있는 부분입니다. 스포키듀는 100% 본사 소속 직영 디렉터만 파견하며, 천재지변 등으로 인한 결근 시 기관이 신경 쓸 필요 없이 본사에서 즉시 대체 강사를 투입하는 2-LAYER 보장 시스템을 운영합니다.' },
    { q: "일반 유아 체육과 '인지 중심 체육'은 무엇이 다른가요?", a: '단순히 지시에 따라 줄을 서고 기구를 넘는 것이 아닙니다. 아이들이 스스로 어떻게 움직일지 규칙 안에서 생각하고, 판단하며, 협력하는 몰입형 프로그램을 통해 신체 발달은 물론 두뇌 자극까지 동시에 끌어냅니다.' },
    { q: '발달이 조금 느린 아이나 휠체어를 타는 아이도 참여 가능한가요?', a: "네, 가능합니다. 스포키듀는 '모두를 위한 성장'을 지향합니다. 특수학급이나 복지관의 경우, 장애인 스포츠 지도사 자격을 갖춘 특수 체육 전문 디렉터가 세심한 난이도 조절을 통해 성공 경험을 제공합니다." },
    { q: '도입 비용은 어떻게 산정되나요?', a: '대상 연령(유아/초등/시니어 등), 수업 횟수, 학생 수, 필요 장비 등에 따라 합리적인 맞춤 견적을 산정합니다. 하단의 문의 폼을 남겨주시면 24시간 내에 상세 견적이 포함된 제안서를 발송해 드립니다.' },
    { q: '체육 수업에 필요한 교구는 기관에서 구매해야 하나요?', a: '전혀 필요 없습니다. 스포키듀의 전담 디렉터가 수업 커리큘럼에 맞는 트렌디하고 안전한 최고급 교구 일체를 직접 지참하여 방문합니다. 기관은 안전한 공간만 마련해 주시면 됩니다.' },
    { q: '계약 단위와 파견 가능 지역이 궁금합니다.', a: '최소 3개월(분기 단위) 계약을 기본으로 진행하여 안정적인 교육 퀄리티를 유지합니다. 현재 수도권(서울·경기·인천) 전 지역 파견이 원활하며, 타 지역은 별도 문의를 통해 협의 가능합니다.' },
  ];

  var programs = ['유아 놀이 체육', '학교 스포츠·방과후', '특수·통합 체육', '운동회·단기 이벤트'];

  function renderCompareTable() {
    var container = document.getElementById('dispatch-compare-rows');
    if (!container) return;
    compareRows.forEach(function (row, i) {
      var div = document.createElement('div');
      div.className = 'grid grid-cols-3 text-sm transition-colors hover:bg-slate-800/30';
      div.style.backgroundColor = i % 2 === 0 ? '' : 'rgba(255,255,255,.015)';
      div.innerHTML =
        '<div class="p-4 sm:p-5 text-slate-300 font-bold border-t" style="border-color:var(--border)">' +
        row[0] +
        '</div>' +
        '<div class="p-4 sm:p-5 text-slate-500 border-l border-t leading-relaxed" style="border-color:var(--border)">' +
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
