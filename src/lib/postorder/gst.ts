// GST credit-note tax math (spec §13). Prices are GST-INCLUSIVE (mirrors the
// invoice generator): split the refunded amount into taxable value + tax, then
// IGST (interstate) or CGST+SGST (intrastate). Pure — paise in, paise out.

export interface CreditNoteTax {
  taxableValuePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
}

export function computeCreditNoteTax(
  amountInclPaise: number,
  gstRate: number,
  interstate: boolean,
): CreditNoteTax {
  const taxable = Math.round(amountInclPaise / (1 + gstRate / 100));
  const tax = amountInclPaise - taxable;
  if (interstate) {
    return { taxableValuePaise: taxable, cgstPaise: 0, sgstPaise: 0, igstPaise: tax };
  }
  const cgst = Math.floor(tax / 2);
  const sgst = tax - cgst; // odd paise goes to SGST so the two halves sum exactly
  return { taxableValuePaise: taxable, cgstPaise: cgst, sgstPaise: sgst, igstPaise: 0 };
}
