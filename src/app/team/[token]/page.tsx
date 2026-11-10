import { TeamCalendar } from "@/components/team-calendar";

export const instant = false;

export default async function TeamPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TeamCalendar token={token} />;
}
