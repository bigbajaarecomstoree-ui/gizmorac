import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/lib/types";

const VARIANT: Record<TicketStatus, "surface" | "soft" | "accent" | "success" | "danger"> = {
  Open: "surface",
  "Awaiting proof": "accent",
  "Under review": "soft",
  Resolved: "success",
  Rejected: "danger",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={VARIANT[status] ?? "surface"}>{status}</Badge>;
}
