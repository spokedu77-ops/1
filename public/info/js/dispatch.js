/**
 * SPOKEDU 파견 랜딩 페이지 스크립트
 * /info/dispatch.html
 */

(function () {
  'use strict';

  var leadEmail = 'spokedu77@gmail.com';
  var leadApiEndpoint = '/api/dispatch/leads';

  var compareRows = [
    ['핵심 커리큘럼', '연세대학교 체육전공자들의 전문성과 실제 현장 데이터가 적용된 연간 커리큘럼', '강사 개인의 경험 및 재량에 의존'],
    ['강사 파견 기준', '체육 전공자 출신으로 스포키듀 교육과정을 이수한 전문 강사', '검증 이력 없는 단기 프리랜서 혼용'],
    ['결근·펑크 리스크', '부재 시 즉시 공유 후 운영진 투입으로 공백 최소화', '대부분 수업 진행 불가 및 휴강 처리'],
    ['수업 진행 방식', '아이의 반응과 움직임을 설계하면서 몰입과 성장의 흐름을 만드는 프로그램', '단순 기구 놀이 및 시간 채우기식 체육'],
    ['기관 제공 데이터', '참여도 및 신체 성장 지표를 분석한 월간 리포트 발송', '전무함 (구두 전달 수준)'],
  ];

  var processSteps = [
    { n: '01', icon: 'message-square', title: '상담 및 접수', desc: '웹사이트 폼, 전화 또는 카카오 채널로 파견 문의를 접수합니다.', duration: '당일~24시간' },
    { n: '02', icon: 'search', title: '기관 환경 분석', desc: '대상 연령, 인원, 특이사항을 파악해 기관에 맞는 제안서를 발송합니다.', duration: '1~2일' },
    { n: '03', icon: 'file-signature', title: '일정·조건 협의', desc: '파견 일정과 수업 구성 등을 협의하고 진행 방식을 확정합니다.', duration: '1~3일' },
    { n: '04', icon: 'user-check', title: '전담 강사 배정', desc: '기관의 성향과 목표에 맞는 검증된 강사를 매칭합니다.', duration: '3~5일' },
    { n: '05', icon: 'play-circle', title: '첫 수업 개시', desc: '기관 담당자와 사전 오리엔테이션 후, 첫 수업을 시작합니다.', duration: '7일 이내' },
  ];

  var faqs = [
    { q: '비용은 어떻게 되나요?', a: '기관 규모, 대상 연령, 파견 횟수에 따라 달라집니다. 제안서 신청 후 맞춤 견적을 안내드립니다.' },
    { q: '최소 계약 기간이 있나요?', a: '없습니다. 원데이 수업부터, 단기, 정기 수업까지 모두 가능합니다.' },
    { q: '강사 교체 요청이 가능한가요?', a: '네, 담당 매니저를 통해 언제든 요청 가능합니다.' },
    { q: '특수학급 아동이 포함된 통합반도 운영되나요?', a: '느린 학습자와 특수 체육 대상자를 고려한 수업 경험이 있는 강사가 함께합니다.' },
    { q: '운영 가능한 지역이 어디인가요?', a: '현재 서울 및 수도권 근교 지역에서 운영 중입니다. 운영 가능 여부는 문의 시 확인해 드립니다.' },
  ];

  var programs = ['스포무브', '월간 스포츠', '슬로우 스포츠', '이벤트 클래스 | 미니 올림픽 & 체험형 스포츠 부스'];

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
        '<div class="p-4 sm:p-5 text-sky-300 font-bold flex items-start sm:items-center gap-2 border-l border-t leading-relaxed" style="border-color:var(--border);background:rgba(56,189,248,.04)">' +
        '<i data-lucide="check-circle-2" class="mt-0.5 sm:mt-0 shrink-0" style="width:16px;height:16px;color:#38bdf8"></i>' +
        row[1] +
        '</div>' +
        '<div class="p-4 sm:p-5 text-slate-500 border-l border-t leading-relaxed flex items-start sm:items-center gap-2" style="border-color:var(--border)">' +
        '<i data-lucide="x-circle" class="mt-0.5 sm:mt-0 shrink-0" style="width:16px;height:16px;color:#64748b"></i>' +
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
      label.className = 'dispatch-choice-card';
      label.innerHTML = '<input type="checkbox" name="programs" value="' + p + '"><span>' + p + '</span>';
      container.appendChild(label);
    });
  }

  function updateChoiceCardState(input) {
    if (!input || !input.closest) return;
    var card = input.closest('.dispatch-choice-card');
    if (!card) return;
    card.classList.toggle('is-selected', !!input.checked);
  }

  function initChoiceCards() {
    document.querySelectorAll('.dispatch-choice-card input').forEach(function (input) {
      updateChoiceCardState(input);
      input.addEventListener('change', function () {
        updateChoiceCardState(input);
      });
    });
  }

  function getCheckedValues(form, name) {
    var values = [];
    form.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (el) {
      values.push(el.value);
    });
    return values;
  }

  function openMailFallback(payload) {
    var subject = '[SPOKEDU] 기관 맞춤 제안서 요청';
    var lines = [
      '기관명/센터명: ' + (payload.organization || '-'),
      '담당자 직책 및 성함: ' + (payload.manager || '-'),
      '연락처: ' + (payload.phone || '-'),
      '이메일: ' + (payload.email || '-'),
      '기관 소재지: ' + (payload.location || '-'),
      '파견 희망 시작일: ' + (payload.startDate || '-'),
      '파견 희망 종료일: ' + (payload.endDate || '-'),
      '파견 희망 프로그램: ' + (payload.programs && payload.programs.length ? payload.programs.join(', ') : '-'),
      '대상 연령: ' + (payload.targetAge && payload.targetAge.length ? payload.targetAge.join(', ') : '-'),
      '대략적인 인원: ' + (payload.headcount || '-'),
      '특수 아동 참여 유무: ' + (payload.specialNeeds || '-'),
      '',
      '[희망하는 수업 내용 또는 방향성]',
      payload.inquiry || '-',
      '',
      '접수 시각: ' + (payload.createdAt || '-'),
      '유입 경로: ' + (payload.source || '-')
    ];
    var body = lines.join('\n');
    var mailto = 'mailto:' + encodeURIComponent(leadEmail) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    window.location.href = mailto;
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
      var submitButton = form.querySelector('button[type="submit"]');
      var originalLabel = submitButton ? submitButton.innerHTML : '';
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = '접수 중...';
      }
      var formData = new FormData(form);
      var payload = {
        organization: formData.get('organization') || '',
        manager: formData.get('manager') || '',
        phone: formData.get('phone') || '',
        email: formData.get('email') || '',
        location: formData.get('location') || '',
        startDate: formData.get('startDate') || '',
        endDate: formData.get('endDate') || '',
        programs: getCheckedValues(form, 'programs'),
        targetAge: getCheckedValues(form, 'targetAge'),
        headcount: formData.get('headcount') || '',
        specialNeeds: formData.get('specialNeeds') || '',
        inquiry: formData.get('inquiry') || '',
        createdAt: new Date().toISOString(),
        source: 'dispatch-page'
      };

      if (!payload.phone && !payload.email) {
        toast.textContent = '⚠️ 연락처(번호 또는 메일) 중 최소 1개를 입력해 주세요.';
        toast.classList.add('show');
        setTimeout(function () {
          toast.classList.remove('show');
        }, 3500);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = originalLabel;
        }
        return;
      }

      fetch(leadApiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) {
            throw new Error('HTTP ' + res.status);
          }
          toast.textContent = '✅ 접수 완료! 운영팀이 확인 후 빠르게 연락드립니다.';
          toast.classList.add('show');
          setTimeout(function () {
            toast.classList.remove('show');
          }, 3800);
          form.reset();
          document.querySelectorAll('.dispatch-choice-card.is-selected').forEach(function (card) {
            card.classList.remove('is-selected');
          });
        })
        .catch(function (error) {
          console.error('[dispatch-contact-form]', error);
          toast.textContent = '⚠️ 접수 연결에 실패해 메일 작성창으로 연결합니다.';
          toast.classList.add('show');
          openMailFallback(payload);
          setTimeout(function () {
            toast.classList.remove('show');
          }, 4500);
        })
        .finally(function () {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalLabel;
          }
        });
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
    initChoiceCards();
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
