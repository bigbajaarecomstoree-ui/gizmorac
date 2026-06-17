// Legal / policy content. Sensible defaults tailored to GIZMORAC (Indian D2C
// electronics) so pages aren't empty — edit the copy here anytime.

export interface PolicySection {
  heading: string;
  body: string[];
}

export interface Policy {
  slug: string;
  title: string;
  summary: string;
  sections: PolicySection[];
}

export const POLICY_CONTACT = {
  email: "support@gizmorac.com",
  phone: "+91 99999 99999",
  address: "GIZMORAC, India",
};

export const policies: Policy[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "How we collect, use and protect your personal information.",
    sections: [
      {
        heading: "Information we collect",
        body: [
          "We collect the details you provide when you create an account or place an order — your name, email, phone number and shipping address — along with order history.",
          "We do not store card or UPI credentials on our servers; payments (when enabled) are handled by our payment partner.",
        ],
      },
      {
        heading: "How we use your information",
        body: [
          "Your information is used to process and deliver orders, provide support, send order updates, and — only if you opt in — share offers and product news.",
        ],
      },
      {
        heading: "Sharing & security",
        body: [
          "We share data only with logistics and payment partners needed to fulfil your order. We never sell your personal information.",
          "Passwords are stored as salted hashes and account sessions use secure, signed cookies.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can view and update your details from your account page, unsubscribe from emails at any time, or request deletion of your account by contacting us.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    summary: "The terms that govern your use of the GIZMORAC store.",
    sections: [
      {
        heading: "Using this website",
        body: [
          "By browsing or ordering from GIZMORAC you agree to these terms. You must provide accurate information and are responsible for activity on your account.",
        ],
      },
      {
        heading: "Orders & pricing",
        body: [
          "All prices are in Indian Rupees and inclusive of applicable taxes. We may correct pricing errors and cancel affected orders with a full refund.",
          "Placing an order is an offer to buy; we confirm acceptance when the order is processed.",
        ],
      },
      {
        heading: "Product information",
        body: [
          "We work to keep product descriptions, images and stock accurate, but minor variations may occur. Warranty terms, where applicable, are as stated on the product page.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "GIZMORAC is not liable for indirect or incidental damages arising from product use beyond the value of the product purchased, to the extent permitted by law.",
        ],
      },
    ],
  },
  {
    slug: "shipping",
    title: "Shipping Policy",
    summary: "Delivery timelines, charges and coverage across India.",
    sections: [
      {
        heading: "Coverage & timelines",
        body: [
          "We ship PAN India. Orders are usually dispatched within 1–2 business days and delivered within 2–7 business days depending on your location.",
        ],
      },
      {
        heading: "Charges",
        body: [
          "Shipping is free on orders above ₹999. A flat ₹79 fee applies to orders below that. Cash on Delivery is available on eligible pincodes.",
        ],
      },
      {
        heading: "Tracking",
        body: [
          "Once dispatched, you can track your order status from your account or the order confirmation page. Tracking details are also shared over email.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    title: "Return & Replacement Policy",
    summary: "Our 7-day replacement promise for eligible items.",
    sections: [
      {
        heading: "7-day replacement",
        body: [
          "If your product arrives damaged, defective or different from what you ordered, request a replacement within 7 days of delivery.",
          "Items must be unused, in original packaging with all accessories and tags.",
        ],
      },
      {
        heading: "How to raise a request",
        body: [
          `Contact us at ${POLICY_CONTACT.email} or via WhatsApp with your order number and photos of the issue. We'll arrange a pickup and replacement.`,
        ],
      },
      {
        heading: "Non-returnable cases",
        body: [
          "Products damaged due to misuse, or returned without original packaging and accessories, may not be eligible for replacement.",
        ],
      },
    ],
  },
  {
    slug: "refund",
    title: "Refund & Cancellation Policy",
    summary: "When and how cancellations and refunds are processed.",
    sections: [
      {
        heading: "Cancellations",
        body: [
          "You can cancel an order before it is shipped at no charge. Once shipped, an order cannot be cancelled but can be returned per our replacement policy.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "For prepaid orders, approved refunds are credited to the original payment method within 5–7 business days. For COD orders, refunds are issued via bank transfer or UPI.",
        ],
      },
      {
        heading: "Need help?",
        body: [
          `Reach us at ${POLICY_CONTACT.email} or ${POLICY_CONTACT.phone} for any refund or cancellation query.`,
        ],
      },
    ],
  },
];

export function getPolicy(slug: string): Policy | undefined {
  return policies.find((p) => p.slug === slug);
}
