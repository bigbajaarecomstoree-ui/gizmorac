import { MessageCircle } from "lucide-react";
import { WHATSAPP_LINK } from "@/lib/constants";

export function WhatsAppButton({ href }: { href?: string }) {
  return (
    <a
      href={href ?? WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 left-5 z-50 flex items-center gap-2.5 rounded-full border border-success/40 bg-success/15 py-3 pl-3 pr-4 text-success backdrop-blur transition-all hover:bg-success/25 hover:shadow-[0_0_24px_-6px_rgba(52,211,153,0.6)]"
    >
      <MessageCircle size={20} className="shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-300 group-hover:max-w-[120px] group-hover:opacity-100">
        Chat with us
      </span>
    </a>
  );
}
