import { useQuery } from '@tanstack/react-query';
import { Printer, Building, FileCheck, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { CopyableSequence } from './CopyableSequence';
import { formatCurrency, formatDate, formatNumber } from '@/lib';
import { getCustomer } from '../api/customer';
import { useAuthStore } from '../store/authStore';
import type { ResponseSaleDTO } from '../types/sale';

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: ResponseSaleDTO | null;
}

// Helper to convert number to Indian words
function numberToWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else {
      str += a[n];
    }
    return str;
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return 'Zero Rupees Only';

  let result = '';
  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;

  if (crore > 0) result += inWords(crore) + 'Crore ';
  if (lakh > 0) result += inWords(lakh) + 'Lakh ';
  if (thousand > 0) result += inWords(thousand) + 'Thousand ';
  if (remainder > 0) result += inWords(remainder);

  result = result.trim() + ' Rupees';
  if (decimalPart > 0) {
    result += ' and ' + inWords(decimalPart).trim() + ' Paise';
  }
  return result + ' Only';
}

export function TaxInvoiceModal({ isOpen, onClose, sale }: TaxInvoiceModalProps) {
  const user = useAuthStore((state) => state.user);

  // Optionally fetch full customer details (address lines, city, state, pin)
  const { data: customerDetails } = useQuery({
    queryKey: ['customerDetail', sale?.customer?.publicId],
    queryFn: () => (sale?.customer?.publicId ? getCustomer(sale.customer.publicId) : null),
    enabled: isOpen && !!sale?.customer?.publicId,
  });

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const gstPercentage = sale.gstPercentage || 18;
  const cgstPercentage = gstPercentage / 2;
  const sgstPercentage = gstPercentage / 2;
  const cgstAmount = sale.gstAmount / 2;
  const sgstAmount = sale.gstAmount / 2;

  const invoiceNumber = sale.customerInvoiceNumber || sale.saleNumber;
  const buyerName = customerDetails?.customerName || sale.customer?.customerName || 'Customer';
  const buyerGst = customerDetails?.gstNumber || sale.customer?.gstNumber || 'Unregistered';
  const buyerPhone = customerDetails?.mobileNumber || sale.customer?.mobileNumber || '—';
  const buyerEmail = customerDetails?.email || sale.customer?.email || '—';
  const buyerAddress = customerDetails?.address
    ? `${customerDetails.address.addressLine1}${
        customerDetails.address.addressLine2 ? ', ' + customerDetails.address.addressLine2 : ''
      }, ${customerDetails.address.city}, ${customerDetails.address.state} - ${customerDetails.address.pincode}`
    : 'Address on record';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tax Invoice — ${invoiceNumber}`}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Printable Invoice Container */}
        <div
          id="printable-tax-invoice"
          className="bg-white dark:bg-[#121824] border border-gray-200 dark:border-[#222E42] rounded-xl p-6 sm:p-7 text-gray-900 dark:text-slate-100 text-xs sm:text-sm font-sans shadow-sm print:border-none print:p-0 print:shadow-none print:bg-white print:text-black"
        >
          {/* Header Banner */}
          <div className="border-b-2 border-slate-800 dark:border-slate-700 pb-4 mb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Building className="h-6 w-6 text-emerald-600 dark:text-emerald-400 print:text-black shrink-0" />
                <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-slate-900 dark:text-slate-50 font-serif print:text-black">
                  {user?.ownerName ? `${user.ownerName} Polymers` : 'Polymer Finance Enterprise'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 print:text-gray-600 font-medium">
                Manufacturer & Trader of Polymer Resins & Compounds
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 print:text-gray-700">
                <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">Contact:</span> {user?.email || 'sales@polymerfinance.com'}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block bg-slate-900 dark:bg-emerald-600 text-white font-bold px-3.5 py-1 text-xs uppercase tracking-widest rounded shadow-xs print:bg-black print:text-white">
                TAX INVOICE
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic print:text-gray-500">
                Original for Recipient
              </p>
              <div className="mt-2 text-xs">
                <div className="inline-flex items-center gap-1.5 sm:justify-end">
                  <span className="font-semibold text-slate-600 dark:text-slate-300 print:text-gray-700">Document Seq:</span>{' '}
                  <CopyableSequence
                    value={sale.saleNumber}
                    plainText
                    size="xs"
                    badgeClassName="font-mono font-bold text-slate-900 dark:text-emerald-400 print:text-black"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Meta & Billing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-200 dark:border-[#222E42] rounded-lg p-4 mb-5 bg-slate-50/70 dark:bg-[#0E141E] print:bg-gray-50 print:border-gray-300">
            {/* Invoice Info */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-gray-600">
                Invoice Details
              </p>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-gray-800">Invoice No:</span>{' '}
                <CopyableSequence
                  value={invoiceNumber}
                  plainText
                  size="xs"
                  badgeClassName="font-mono font-bold text-slate-900 dark:text-emerald-400 print:text-black text-sm"
                />
              </div>
              <p>
                <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-gray-800">Invoice Date:</span>{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100 print:text-black">{formatDate(sale.saleDate)}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-gray-800">Payment Status:</span>
                <Badge
                  variant={
                    sale.paymentStatus === 'PAID'
                      ? 'success'
                      : sale.paymentStatus === 'PARTIALLY_PAID'
                      ? 'warning'
                      : 'danger'
                  }
                  className="text-[10px] font-semibold tracking-wider"
                >
                  {sale.paymentStatus.replace('_', ' ')}
                </Badge>
              </p>
            </div>

            {/* Buyer Info */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-gray-600">
                Billed To (Buyer)
              </p>
              <p className="font-bold text-base text-slate-900 dark:text-slate-100 print:text-black">
                {buyerName}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 print:text-gray-700 leading-relaxed">
                {buyerAddress}
              </p>
              <p>
                <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-gray-800">GSTIN:</span>{' '}
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 print:text-black">{buyerGst}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 print:text-gray-600">
                <span className="font-medium text-slate-700 dark:text-slate-300 print:text-gray-800">Phone:</span> {buyerPhone} &nbsp;|&nbsp; <span className="font-medium text-slate-700 dark:text-slate-300 print:text-gray-800">Email:</span> {buyerEmail}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-gray-200 dark:border-[#222E42] rounded-lg overflow-hidden mb-5 print:border-gray-400">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-[#161F2E] border-b border-gray-200 dark:border-[#222E42] print:bg-gray-100 print:border-gray-400">
                <tr className="text-xs uppercase font-bold text-slate-700 dark:text-slate-200 print:text-black">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3">Description of Goods</th>
                  <th className="py-3 px-3 w-24">HSN Code</th>
                  <th className="py-3 px-3 w-28 text-right">Quantity</th>
                  <th className="py-3 px-3 w-28 text-right">Rate / Unit</th>
                  <th className="py-3 px-3 w-32 text-right">Taxable Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#222E42] print:divide-gray-300 text-xs">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-medium print:text-gray-600">1</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 print:text-black">{sale.rawMaterial}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 print:text-gray-500">
                      Virgin / Processed Polymer Standard Grade
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 print:text-gray-700">3901 / 3902</td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-slate-900 dark:text-slate-100 print:text-black">
                    {formatNumber(sale.weight, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-slate-500 dark:text-slate-400 font-normal">{sale.unit}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-slate-900 dark:text-slate-100 print:text-black">
                    {formatCurrency(sale.ratePerUnit)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 print:text-black">
                    {formatCurrency(sale.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Calculations & Totals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Amount in Words & Notes */}
            <div className="space-y-3">
              <div className="bg-slate-50/70 dark:bg-[#0E141E] border border-gray-200 dark:border-[#222E42] rounded-lg p-3.5 print:bg-gray-50 print:border-gray-300">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide print:text-gray-600">
                  Amount in Words:
                </p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 italic mt-1 leading-relaxed print:text-black">
                  {numberToWords(sale.totalAmount)}
                </p>
              </div>

              <div className="text-[11px] space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 print:text-gray-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 print:text-black shrink-0" />
                  <span>Terms & Conditions:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400 print:text-gray-600">
                  <li>Weighbridge weight certificate accepted as final dispatch quantity.</li>
                  <li>Payment must be settled strictly within agreed credit terms.</li>
                  <li>Overdue accounts attract interest @ 18% p.a. from due date.</li>
                </ul>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="border border-gray-200 dark:border-[#222E42] rounded-lg p-3.5 space-y-2.5 bg-slate-50/70 dark:bg-[#0E141E] text-xs print:bg-gray-50 print:border-gray-300">
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#222E42] print:border-gray-300">
                <span className="text-slate-600 dark:text-slate-300 print:text-gray-700">Taxable Amount:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 print:text-black">{formatCurrency(sale.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#222E42] print:border-gray-300">
                <span className="text-slate-600 dark:text-slate-300 print:text-gray-700">CGST ({cgstPercentage}%):</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-gray-900">{formatCurrency(cgstAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#222E42] print:border-gray-300">
                <span className="text-slate-600 dark:text-slate-300 print:text-gray-700">SGST ({sgstPercentage}%):</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-gray-900">{formatCurrency(sgstAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#222E42] print:border-gray-300 font-medium">
                <span className="text-slate-700 dark:text-slate-200 print:text-gray-800 font-semibold">Total Tax:</span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400 print:text-black">{formatCurrency(sale.gstAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 font-bold text-sm bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200/90 dark:border-emerald-700/60 rounded-md print:bg-gray-100 print:border-gray-400">
                <span className="text-emerald-900 dark:text-emerald-200 print:text-black uppercase tracking-wide text-xs sm:text-sm font-bold">
                  Invoice Total (INR):
                </span>
                <span className="font-mono font-bold text-base sm:text-lg text-emerald-700 dark:text-emerald-300 print:text-black">
                  {formatCurrency(sale.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures & Bank Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-[#222E42] text-xs print:border-gray-400">
            <div className="space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-200 print:text-black">Remittance Bank Details:</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 print:text-gray-700"><span className="text-slate-500 dark:text-slate-400">Bank:</span> HDFC Bank / State Bank of India</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 print:text-gray-700"><span className="text-slate-500 dark:text-slate-400">A/C Type:</span> Current Account</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 print:text-gray-700 font-mono"><span className="text-slate-500 dark:text-slate-400 font-sans">IFSC:</span> HDFC0001234 / SBIN0005678</p>
            </div>
            <div className="text-left sm:text-right flex flex-col justify-end items-start sm:items-end mt-2 sm:mt-0">
              <p className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-200 print:text-black">
                For {user?.ownerName ? `${user.ownerName} Polymers` : 'Polymer Enterprise'}
              </p>
              <div className="h-12 flex items-center justify-center">
                <FileCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400 print:text-black opacity-80" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 print:text-gray-600 border-t border-gray-300 dark:border-slate-600 print:border-gray-400 pt-1 w-44 text-center font-medium">
                Authorized Signatory
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (Hidden when Printing) */}
        <div className="flex justify-between items-center pt-2 print:hidden">
          <p className="text-xs text-gray-500">
            Click Print to export to PDF or print directly via browser print dialog.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print Tax Invoice
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
