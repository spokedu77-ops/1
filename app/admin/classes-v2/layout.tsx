import ClassesV2AutoFinish from "./ClassesV2AutoFinish";

export default function ClassesV2Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClassesV2AutoFinish />
      {children}
    </>
  );
}
