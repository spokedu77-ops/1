import ClassesAutoFinish from "./ClassesAutoFinish";

export default function ClassesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClassesAutoFinish />
      {children}
    </>
  );
}
