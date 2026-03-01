function openKakao() {
  const { webUrl, deepLink } = CONFIG.kakao;
  if (!deepLink) {
    if (webUrl) window.open(webUrl, "_blank", "noopener,noreferrer");
    else alert("카카오 채널 링크를 설정해주세요. (CONFIG.kakao.webUrl)");
    return;
  }
  let appOpened = false;
  const onVisibility = () => { appOpened = true; };
  document.addEventListener("visibilitychange", onVisibility, { once: true });
  window.location.href = deepLink;
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibility);
    if (!appOpened && webUrl) window.location.href = webUrl;
  }, 1500);
}
