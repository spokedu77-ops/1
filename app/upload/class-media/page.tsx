export const metadata = {
  title: '자료 올리기',
  robots: { index: false, follow: false },
};

export default function ClassMediaUploadPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">사진·영상 올리기</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        휴대폰으로 찍은 원본을 그대로 올리는 화면입니다. 저장 한도는 50GB입니다.
        올리기 동작은 다음 단계에서 연결합니다.
      </p>
    </main>
  );
}
