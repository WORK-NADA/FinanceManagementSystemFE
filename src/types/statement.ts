export interface LedgerEntryDTO {
  date: string;
  entryType: 'INVOICE' | 'BILL' | 'PAYMENT' | string;
  documentNumber: string;
  referenceNumber?: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  paymentMode?: string;
  remarks?: string;
}

export interface ResponsePartyStatementDTO {
  partyPublicId: string;
  partyName: string;
  mobileNumber: string;
  email?: string;
  gstNumber?: string;
  city?: string;
  address?: string;
  openingBalance: number;
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  entries: LedgerEntryDTO[];
}
