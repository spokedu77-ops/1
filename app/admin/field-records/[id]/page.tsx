import FieldRecordEditor from '../FieldRecordEditor';
export default async function EditFieldRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FieldRecordEditor id={id} />;
}
