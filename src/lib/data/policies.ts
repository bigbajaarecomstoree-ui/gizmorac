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
  phone: "+91 93102 14091",
  address: "GIZMORAC, India",
};

export const policies: Policy[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary:
      "This Privacy Policy outlines how personal information is collected, used, and safeguarded when you interact with this website. By accessing or using the website, you agree to the practices described below.",
    sections: [
      {
        heading: "1. Information We Collect",
        body: [
          "We may collect the following types of information:",
          "Personal Information: Name, phone number, email address, billing/shipping address.",
          "Payment Information: Used to process orders securely through third-party payment gateways.",
          "Technical Information: IP address, browser type, device information, and usage data via cookies or similar technologies.",
        ],
      },
      {
        heading: "2. How We Use Your Information",
        body: [
          "To process and deliver orders.",
          "To send transactional communications such as order updates or shipping alerts.",
          "To respond to customer inquiries or service requests.",
          "To improve website functionality, services, and user experience.",
          "For marketing purposes (only with your explicit consent).",
        ],
      },
      {
        heading: "3. Data Sharing",
        body: [
          "We do not sell, rent, or trade your personal data.",
          "We may share necessary information with third-party service providers such as payment gateways, delivery partners, or IT service providers — only to fulfill your order or maintain the website.",
          "Personal information may be disclosed if required by law or legal proceedings.",
        ],
      },
      {
        heading: "4. Data Security",
        body: [
          "We implement reasonable security measures to protect your data from unauthorized access, alteration, or disclosure.",
          "However, no online transmission is 100% secure. You acknowledge this risk when using the site.",
        ],
      },
      {
        heading: "5. Cookies and Tracking Technologies",
        body: [
          "Cookies are used to personalize your experience, analyze site traffic, and provide relevant ads.",
          "You can manage or disable cookies via your browser settings, although this may affect site functionality.",
        ],
      },
      {
        heading: "6. Third-Party Links",
        body: [
          "This website may contain links to third-party websites. We are not responsible for the privacy practices or content of those websites.",
        ],
      },
      {
        heading: "7. Your Rights",
        body: [
          "You may request access to or correction of your personal data.",
          "You may opt out of marketing communications at any time.",
        ],
      },
      {
        heading: "8. Changes to This Policy",
        body: [
          "This privacy policy may be updated periodically. Continued use of the website after changes indicates acceptance of the revised policy.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    summary:
      "These Terms and Conditions govern your use of this website and the purchase of products or services offered herein. By accessing or using this website, you agree to be bound by these terms. Please read them carefully.",
    sections: [
      {
        heading: "1. General Use",
        body: [
          "By using this website, you confirm that you are at least 18 years old or are using the website under the supervision of a parent or legal guardian.",
          "All content on this website is for informational purposes only and is subject to change without notice.",
        ],
      },
      {
        heading: "2. User Responsibilities",
        body: [
          "Users agree not to misuse the website by knowingly introducing viruses, trojans, or other malicious material.",
          "You must not attempt to gain unauthorized access to the server, database, or any part of the site.",
        ],
      },
      {
        heading: "3. Product & Service Descriptions",
        body: [
          "All efforts are made to ensure accuracy in product descriptions, images, pricing, and availability.",
          "However, we do not warrant that product descriptions or other content are complete, current, or error-free.",
        ],
      },
      {
        heading: "4. Order Acceptance & Cancellation",
        body: [
          "Placing an order on this website does not constitute a confirmed order. We reserve the right to refuse or cancel any order for reasons including but not limited to product availability, pricing errors, or suspected fraud.",
          "Once placed, orders may not be canceled or modified unless otherwise stated in the return policy.",
        ],
      },
      {
        heading: "5. Pricing and Payment",
        body: [
          "All prices are displayed in INR or the local currency and are inclusive or exclusive of taxes as indicated.",
          "Payments must be made through secure and approved payment gateways. The website is not liable for any payment gateway errors.",
        ],
      },
      {
        heading: "6. Intellectual Property",
        body: [
          "All text, graphics, logos, images, and other materials on this website are the intellectual property of their respective owners and protected by copyright and trademark laws.",
          "Unauthorized use or duplication of any materials is prohibited.",
        ],
      },
      {
        heading: "7. Limitation of Liability",
        body: [
          "We are not responsible for any indirect or consequential damages that may arise from the use or inability to use the website or the products purchased through it.",
          "Liability is limited to the value of the product purchased, if applicable.",
        ],
      },
      {
        heading: "8. Modifications to Terms",
        body: [
          "These terms may be revised at any time without prior notice. Continued use of the site after changes implies acceptance of those changes.",
        ],
      },
      {
        heading: "9. Governing Law",
        body: [
          "These terms shall be governed by and construed in accordance with the laws of India.",
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
        heading: "7-Day Return & Replacement",
        body: [
          "If your product arrives damaged, defective, or different from what you ordered, you must request a Return or Replacement within 7 days of delivery.",
          "Items must be unused, in their original packaging, and include all accessories and tags.",
        ],
      },
      {
        heading: "How to Raise a Request",
        body: [
          "To initiate your request, please share your order number and photos of the issue with our customer support team by email at {{email}}.",
          "Resolution: Once verified, we will arrange a pickup. Your replaced product will be delivered within 7 days.",
        ],
      },
      {
        heading: "Non-Returnable Cases",
        body: [
          "Products may not be eligible for replacement if they are damaged due to misuse.",
          "Products may not be eligible for replacement if they are returned without their original packaging, accessories, or tags.",
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
          "You can cancel an order yourself until 11:59 PM (IST) on the day you place it, as long as it has not yet been dispatched — whichever comes first. Cancelling within this window is free and refunds anything you paid online to the original payment method.",
          "After that window, or once the order has been dispatched, it cannot be cancelled. If there is a problem with the product, you can raise a dispute within 48 hours of delivery and our team will help.",
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
          `Reach us at {{email}} or {{phone}} for any refund or cancellation query.`,
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    summary: "How GIZMORAC uses cookies and similar technologies.",
    sections: [
      {
        heading: "What cookies are",
        body: [
          "Cookies are small text files stored on your device that help a website work and remember your preferences. We use cookies and similar technologies on the GIZMORAC store.",
        ],
      },
      {
        heading: "How we use cookies",
        body: [
          "Essential cookies keep you signed in, remember your cart, and secure checkout — the site cannot work properly without these.",
          "Analytics cookies help us understand how the store is used so we can improve it. These are optional and never identify you personally.",
        ],
      },
      {
        heading: "Managing cookies",
        body: [
          "You can clear or block cookies from your browser settings at any time. Blocking essential cookies may affect login, cart and checkout.",
        ],
      },
      {
        heading: "Questions?",
        body: [
          `For any question about cookies or your data, contact us at {{email}}.`,
        ],
      },
    ],
  },
  {
    slug: "cod-policy",
    title: "COD Policy",
    summary: "How Cash on Delivery and the booking advance work.",
    sections: [
      {
        heading: "How COD works",
        body: [
          "On Cash on Delivery (COD) orders, a small booking amount is collected online at checkout to confirm the order, and the remaining balance is collected in cash at the time of delivery.",
          "The amount payable on delivery is always the order total minus the booking amount already paid. The exact split is shown at checkout, on your order page, and on your invoice.",
        ],
      },
      {
        heading: "Delivery payment",
        body: [
          "Please keep the balance amount ready in cash when your order is out for delivery. Our courier collects it at the doorstep.",
          "Once the balance is collected, your order is marked fully paid.",
        ],
      },
      {
        heading: "Cancellations & the booking advance",
        body: [
          "If you cancel before the order is dispatched — and within the cancellation window (until 11:59 PM IST on the day you order) — the booking amount is refunded to your original payment method.",
          "If a delivery is refused, returns to origin (RTO), or cannot be completed because you are unreachable, the booking amount is retained to cover shipping and handling costs already incurred.",
          "In the case of a damaged or defective shipment, our team reviews each case individually and will refund or replace as appropriate.",
        ],
      },
      {
        heading: "Returns, refunds & support",
        body: [
          "Eligible returns and refunds follow our Returns and Refund policies. Refunds of the booking amount, where applicable, are processed to the original payment method.",
          "For help with a COD order, contact us at {{email}} or {{phone}}.",
        ],
      },
    ],
  },
];

export function getPolicy(slug: string): Policy | undefined {
  return policies.find((p) => p.slug === slug);
}
