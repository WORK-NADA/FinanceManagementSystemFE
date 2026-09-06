import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer, RotateCcw, Calendar, TrendingUp, TrendingDown, Wallet, Building2, Phone, Mail } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Badge } from './Badge';
import { CopyableSequence } from './CopyableSequence';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { TableSkeleton } from './Skeleton';
import { ErrorState } from './ErrorState';
import { formatCurrency, formatDate } from '@/lib';
import { getCustomerStatement } from '../api/customer';
import { getSupplierStatement } from '../api/supplier';
import { exportProfessionalCsv, formatCsvNumber, formatCsvEnum, formatCsvDate, formatCsvTimestamp } from '../utils/csvExport';
import type { ResponsePartyStatementDTO } from '../types/statement';

interface PartyStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyType: 'customer' | 'supplier';
  partyPublicId: string | null;
  partyName: string;
}

export function PartyStatementModal({
  isOpen,
  onClose,
  partyType,
  partyPublicId,
  partyName,
}: PartyStatementModalProps) {
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const {
    data: statement,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ResponsePartyStatementDTO>({
    queryKey: ['partyStatement', partyType, partyPublicId, fromDate, toDate],
    queryFn: () => {
      if (!partyPublicId) throw new Error('No party selected');
      const params = {
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
      };
      return partyType === 'customer'
        ? getCustomerStatement(partyPublicId, params)
        : getSupplierStatement(partyPublicId, params);
    },
    enabled: isOpen && !!partyPublicId,
  });

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const handleExportCSV = () => {
    if (!statement || !statement.entries || statement.entries.length === 0) return;

    const isCustomerParty = partyType === 'customer';
    const totalDebit = statement.entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = statement.entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    exportProfessionalCsv({
      filename: `${partyType}_statement_${statement.partyName}_${formatCsvDate(new Date().toISOString())}`,
      documentTitle: `${isCustomerParty ? 'Customer' : 'Supplier'} Account Statement & Ledger`,
      subtitle: `Official Statement of Accounts — ${statement.partyName}`,
      metadata: [
        { label: 'Party Name', value: statement.partyName },
        { label: 'Party Type', value: isCustomerParty ? 'Customer' : 'Supplier' },
        { label: 'GSTIN', value: statement.gstNumber || 'N/A' },
        { label: 'Contact Mobile', value: statement.mobileNumber || 'N/A' },
        { label: 'Email Address', value: statement.email || 'N/A' },
        { label: 'City / Address', value: [statement.city, statement.address].filter(Boolean).join(', ') || 'N/A' },
        { label: 'Statement Period', value: `${fromDate || 'Beginning'} to ${toDate || 'Present'}` },
        { label: 'Exported On', value: formatCsvTimestamp() },
      ],
      sections: [
        {
          sectionTitle: 'Financial Summary',
          headers: ['Metric / Account Balance', 'Amount (INR)', 'Description'],
          rows: [
            ['Opening Balance', formatCsvNumber(statement.openingBalance), 'Balance brought forward'],
            [isCustomerParty ? 'Total Sales Invoiced' : 'Total Purchases Billed', formatCsvNumber(statement.totalBilled), isCustomerParty ? 'Gross sales billed to customer' : 'Gross purchases billed by supplier'],
            [isCustomerParty ? 'Total Collections Received' : 'Total Payments Made', formatCsvNumber(statement.totalPaid), isCustomerParty ? 'Total receipts collected' : 'Total disbursements paid'],
            [isCustomerParty ? 'Current Outstanding Receivable' : 'Current Pending Payable', formatCsvNumber(statement.outstandingBalance), isCustomerParty ? 'Net pending balance to collect' : 'Net pending balance to pay'],
          ],
        },
        {
          sectionTitle: 'Chronological Transaction Ledger',
          headers: [
            'Date',
            'Transaction Type',
            'Document / Ref #',
            'External Ref #',
            'Description',
            'Payment Method',
            'Debit (INR)',
            'Credit (INR)',
            'Running Balance (INR)',
            'Remarks',
          ],
          rows: statement.entries.map((e) => [
            formatCsvDate(e.date),
            formatCsvEnum(e.entryType),
            e.documentNumber || '—',
            e.referenceNumber || '—',
            e.description || '—',
            formatCsvEnum(e.paymentMode, '—'),
            formatCsvNumber(e.debit),
            formatCsvNumber(e.credit),
            formatCsvNumber(e.runningBalance),
            e.remarks || '',
          ]),
          summaryRow: [
            'Total / Net Closing Balance',
            '',
            '',
            '',
            '',
            '',
            formatCsvNumber(totalDebit),
            formatCsvNumber(totalCredit),
            formatCsvNumber(statement.outstandingBalance),
            '',
          ],
        },
      ],
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const isCustomer = partyType === 'customer';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isCustomer ? 'Customer' : 'Supplier'} Statement & Ledger — ${partyName}`}
      className="max-w-5xl"
    >
      <div className="space-y-6 print:m-0 print:p-0">
        {/* Party Metadata Banner */}
        {statement && (
          <div className="bg-gray-50/70 dark:bg-[#141A24] p-5 rounded-2xl border border-gray-200/90 dark:border-[#1F2837] flex flex-col sm:flex-row justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-700 dark:text-slate-300" />
                <span className="font-serif font-bold text-lg text-gray-900 dark:text-slate-100">{statement.partyName}</span>
                <Badge variant={isCustomer ? 'info' : 'indigo'}>
                  {isCustomer ? 'Customer' : 'Supplier'}
                </Badge>
              </div>
              {statement.address && (
                <p className="text-xs text-gray-600 dark:text-slate-400">{statement.address}</p>
              )}
              {statement.gstNumber && (
                <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">GSTIN: {statement.gstNumber}</p>
              )}
            </div>

            <div className="flex flex-col sm:items-end justify-center text-xs text-gray-600 dark:text-slate-400 space-y-1">
              {statement.mobileNumber && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
                  <span>{statement.mobileNumber}</span>
                </div>
              )}
              {statement.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
                  <span>{statement.email}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Date Filter & Quick Actions (Hidden in Print) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500 dark:text-slate-400" />
              <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider">Period:</span>
            </div>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36 text-sm"
              placeholder="From Date"
              aria-label="From Date"
            />
            <span className="text-gray-400 dark:text-slate-500 text-sm">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36 text-sm"
              placeholder="To Date"
              aria-label="To Date"
            />
            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs gap-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!statement || statement.entries.length === 0}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!statement}
              className="gap-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" /> Print Statement
            </Button>
          </div>
        </div>

        {/* Summary KPI Ribbon */}
        {statement && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Opening Balance</span>
              <p className="text-lg font-serif font-bold text-gray-800 dark:text-slate-100 mt-1">
                {formatCurrency(statement.openingBalance)}
              </p>
            </div>

            <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  {isCustomer ? 'Total Sales Invoiced' : 'Total Purchases Billed'}
                </span>
                <TrendingUp className="h-4 w-4 text-blue-500 dark:text-sky-400" />
              </div>
              <p className="text-lg font-serif font-bold text-blue-700 dark:text-sky-400 mt-1">
                {formatCurrency(statement.totalBilled)}
              </p>
            </div>

            <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  {isCustomer ? 'Total Payments Received' : 'Total Payments Made'}
                </span>
                <TrendingDown className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              </div>
              <p className="text-lg font-serif font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {formatCurrency(statement.totalPaid)}
              </p>
            </div>

            <div className="bg-emerald-50/40 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  {isCustomer ? 'Remaining to Collect' : 'Remaining to Pay'}
                </span>
                <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-lg font-serif font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                {formatCurrency(statement.outstandingBalance)}
              </p>
            </div>
          </div>
        )}

        {/* Ledger Table */}
        {isLoading ? (
          <div className="rounded-2xl border border-gray-200/90 dark:border-[#1F2837] bg-white dark:bg-[#141A24] p-4 shadow-xs">
            <TableSkeleton columns={7} rows={6} />
          </div>
        ) : isError ? (
          <ErrorState
            message={(error as any)?.message || 'Failed to load statement ledger.'}
            onRetry={() => refetch()}
          />
        ) : !statement || statement.entries.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-[#0E131C] rounded-xl border border-dashed border-slate-200 dark:border-[#1F2837]">
            <p className="text-slate-600 dark:text-slate-300 font-medium">No transactions found in this period</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Opening balance at the start of this period:{' '}
              {formatCurrency(statement?.openingBalance ?? 0)}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-[#1F2837] bg-white dark:bg-[#141A24] shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-[#0E131C]">
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-36 whitespace-nowrap">Doc #</TableHead>
                  <TableHead className="w-32 whitespace-nowrap">Bill / Inv #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-28 whitespace-nowrap">Debit / Paid (₹)</TableHead>
                  <TableHead className="text-right w-28 whitespace-nowrap">Credit / Billed (₹)</TableHead>
                  <TableHead className="text-right w-32 font-bold whitespace-nowrap">Running Balance (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Opening Balance Row */}
                <TableRow className="bg-slate-50/50 dark:bg-[#0E131C]/60 font-medium italic text-xs text-slate-600 dark:text-slate-400">
                  <TableCell>{fromDate ? formatDate(fromDate) : '—'}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="text-[10px] uppercase">
                      OPENING
                    </Badge>
                  </TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>Opening Balance brought forward</TableCell>
                  <TableCell className="text-right tabular-nums">—</TableCell>
                  <TableCell className="text-right tabular-nums">—</TableCell>
                  <TableCell className="text-right tabular-nums font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(statement.openingBalance)}
                  </TableCell>
                </TableRow>

                {statement.entries.map((entry, idx) => {
                  const isPayment = entry.entryType === 'PAYMENT';
                  return (
                    <TableRow key={`${entry.documentNumber}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-[#1A2331]">
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            isPayment
                              ? 'success'
                              : entry.entryType === 'INVOICE'
                              ? 'default'
                              : 'info'
                          }
                          className="text-[10px]"
                        >
                          {entry.entryType}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <CopyableSequence
                          value={entry.documentNumber}
                          plainText
                          size="xs"
                          badgeClassName="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                        {entry.referenceNumber || '—'}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={entry.description}>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{entry.description}</div>
                        {entry.paymentMode && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-400">
                            Mode: {entry.paymentMode} {entry.remarks ? `• ${entry.remarks}` : ''}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-mono">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-mono">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(entry.runningBalance)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-2 print:hidden">
          <p className="text-xs text-slate-400">
            * Progressive ledger reflects all trade invoices and payments registered in the system.
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
