import type { Address as AddressRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Address } from "@/lib/types";

function map(r: AddressRow): Address {
  return {
    id: r.id,
    label: r.label,
    fullName: r.fullName,
    phone: r.phone,
    line1: r.line1,
    city: r.city,
    state: r.state,
    pincode: r.pincode,
    isDefault: r.isDefault,
  };
}

/** Every saved address for a customer, default first then newest. */
export async function getAddressesForCustomer(customerId: string): Promise<Address[]> {
  if (!customerId) return [];
  const rows = await prisma.address.findMany({
    where: { customerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(map);
}
