import ThreadDetail from "@/components/admin/ThreadDetail";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <ThreadDetail bookingId={Number(bookingId)} />;
}
