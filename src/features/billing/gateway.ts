/**
 * Camada futura para gateway de pagamentos (Pix / cartão).
 * MVP: apenas registro manual via payment_records — sem UI de "Pagar" no app.
 */

export type PaymentGatewayProvider = 'manual' | 'pix_stub' | 'card_stub'

export type CreateCheckoutInput = {
  chargeId: string
  amountCents: number
  currency: string
  description: string
  customerEmail?: string | null
  idempotencyKey: string
}

export type CheckoutSession = {
  provider: PaymentGatewayProvider
  externalId: string
  checkoutUrl?: string
  pixCopyPaste?: string
  expiresAt?: string
}

export type PaymentGateway = {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>
  // confirmWebhook(payload: unknown): Promise<void>
}

/** Stub — implementação real virá com Edge Functions + provedor. */
export const paymentGatewayStub: PaymentGateway = {
  async createCheckout(_input) {
    throw new Error('Gateway de pagamento ainda não configurado.')
  },
}

// export async function createPixCheckout(input: CreateCheckoutInput) {
//   return paymentGatewayStub.createCheckout(input)
// }
