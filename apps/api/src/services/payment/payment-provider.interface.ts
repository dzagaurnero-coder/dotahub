export interface CreateDepositIntentInput {
  userId: string;
  amountMinor: number;
  idempotencyKey: string;
  description?: string;
}

export interface DepositIntentResult {
  providerName: string;
  externalTransactionId: string;
  status: 'succeeded' | 'pending' | 'failed';
  creditedAmountMinor: number;
  processedAt: Date;
}

export interface IPaymentProvider {
  readonly providerCode: string;
  processDemoOrLiveDeposit(
    input: CreateDepositIntentInput
  ): Promise<DepositIntentResult>;
}