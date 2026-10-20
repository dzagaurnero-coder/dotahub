import crypto from 'node:crypto';
import { BadRequestError } from '@/utils/errors';
import type {
  CreateDepositIntentInput,
  DepositIntentResult,
  IPaymentProvider,
} from '@/services/payment/payment-provider.interface';

const MIN_DEPOSIT_MINOR = 1000; // Минимум 10 ₽ (1 000 копеек)
const MAX_DEPOSIT_MINOR = 5000000; // Максимум 50 000 ₽ за одну операцию (5 000 000 копеек)

export class DemoPaymentProvider implements IPaymentProvider {
  public readonly providerCode = 'dotahub_demo_gateway';

  public async processDemoOrLiveDeposit(
    input: CreateDepositIntentInput
  ): Promise<DepositIntentResult> {
    if (
      !Number.isInteger(input.amountMinor) ||
      input.amountMinor < MIN_DEPOSIT_MINOR ||
      input.amountMinor > MAX_DEPOSIT_MINOR
    ) {
      throw new BadRequestError(
        'Сумма пополнения должна быть от 10 ₽ до 50 000 ₽.'
      );
    }

    const digest = crypto
      .createHash('sha256')
      .update(`${input.userId}:${input.idempotencyKey}:${input.amountMinor}`)
      .digest('hex')
      .slice(0, 16);

    return {
      providerName: this.providerCode,
      externalTransactionId: `demo_tx_${digest}`,
      status: 'succeeded',
      creditedAmountMinor: input.amountMinor,
      processedAt: new Date(),
    };
  }
}

export const paymentService: IPaymentProvider = new DemoPaymentProvider();