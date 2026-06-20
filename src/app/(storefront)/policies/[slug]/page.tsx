import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { policies, getPolicy, POLICY_CONTACT } from "@/lib/data/policies";
import { getSettings } from "@/lib/data/settings";
import { Breadcrumb } from "@/components/ui/breadcrumb";

type Params = Promise<{ slug: string }>;

// Render per-request so company contact details from Settings stay current.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return policies.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) return { title: "Policy not found" };
  return {
    title: policy.title,
    description: policy.summary,
    alternates: { canonical: `/policies/${policy.slug}` },
  };
}

export default async function PolicyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  const settings = await getSettings();
  const email = settings.supportEmail?.trim() || POLICY_CONTACT.email;
  const phone = settings.supportPhone?.trim() || POLICY_CONTACT.phone;
  const fill = (s: string) =>
    s.replaceAll("{{email}}", email).replaceAll("{{phone}}", phone);

  return (
    <div className="shell py-8">
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: policy.title }]}
      />
      <div className="mx-auto mt-6 max-w-3xl">
        <p className="tech-label">Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{policy.title}</h1>
        <p className="mt-2 text-muted">{policy.summary}</p>

        <div className="mt-10 space-y-10">
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-muted">
                {section.body.map((p, i) => (
                  <p key={i}>{fill(p)}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
