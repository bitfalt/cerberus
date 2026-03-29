import { z } from "zod";
import {
  GOVERNED_ACTIONS,
  PAYMENT_NETWORKS,
  WORLD_ID_ACTIONS,
  XMTP_MESSAGE_TYPES,
} from "./constants";

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const hexSchema = z.string().regex(/^0x[a-fA-F0-9]+$/);
export const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

export const paymentNetworkSchema = z.enum(PAYMENT_NETWORKS);
export const governedActionSchema = z.enum(GOVERNED_ACTIONS);
export const worldIdActionSchema = z.enum(WORLD_ID_ACTIONS);
export const xmtpMessageTypeSchema = z.enum(XMTP_MESSAGE_TYPES);

export const proposalSchema = z.object({
  version: z.literal(1),
  proposalId: z.string().min(1),
  vault: addressSchema,
  chainId: z.literal(84532),
  proposalType: z.literal("swap"),
  paymentRequirement: z.object({
    required: z.boolean(),
    paymentNetwork: paymentNetworkSchema,
    paymentAsset: z.string().min(1),
    paymentAmount: z.string().min(1),
  }),
  action: z.object({
    adapter: addressSchema,
    tokenIn: addressSchema,
    tokenOut: addressSchema,
    amountIn: z.string().min(1),
    minAmountOut: z.string().min(1),
    targetRouter: addressSchema,
    encodedCall: hexSchema,
  }),
  risk: z.object({
    score: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
    analysisSummary: z.string().min(1),
  }),
  timing: z.object({
    createdAt: z.number().int().positive(),
    expiresAt: z.number().int().positive(),
  }),
  metadata: z.object({
    sourceRefs: z.array(z.string()).max(10),
    policyVersion: z.string().min(1),
  }),
});

export const worldIdVerificationSchema = z.object({
  action: worldIdActionSchema,
  signalHash: hashSchema,
  wallet: addressSchema,
  vault: addressSchema,
  proposalHash: hashSchema.optional(),
  recoveryAddress: addressSchema.optional(),
  requestNonce: z.string().min(1),
  verifiedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  verificationLevel: z.enum(["orb", "device"]),
  protocolVersion: z.string().min(1),
  nullifier: z.string().min(1),
});

export const paymentIntentSchema = z.object({
  paymentId: z.string().min(1),
  proposalId: z.string().min(1),
  proposalHash: hashSchema,
  wallet: addressSchema,
  vault: addressSchema,
  executionChain: z.literal("base-sepolia"),
  paymentNetwork: paymentNetworkSchema,
  asset: z.string().min(1),
  amount: z.string().min(1),
  status: z.enum(["pending", "verified", "settled", "failed", "expired"]),
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  settlementTxHash: hashSchema.optional(),
});

export const executionAuthorizationSchema = z.object({
  vault: addressSchema,
  proposalId: z.string().min(1),
  proposalHash: hashSchema,
  adapter: addressSchema,
  tokenIn: addressSchema,
  tokenOut: addressSchema,
  amountIn: z.string().min(1),
  minAmountOut: z.string().min(1),
  callDataHash: hashSchema,
  nonce: z.string().min(1),
  validAfter: z.number().int().nonnegative(),
  validUntil: z.number().int().positive(),
  policyHash: hashSchema,
});

export const withdrawalAuthorizationSchema = z.object({
  vault: addressSchema,
  token: addressSchema,
  to: addressSchema,
  amount: z.string().min(1),
  nonce: z.string().min(1),
  validAfter: z.number().int().nonnegative(),
  validUntil: z.number().int().positive(),
  policyHash: hashSchema,
});

export const recoveryAuthorizationSchema = z.object({
  vault: addressSchema,
  recoveryAddress: addressSchema,
  nonce: z.string().min(1),
  validAfter: z.number().int().nonnegative(),
  validUntil: z.number().int().positive(),
  policyHash: hashSchema,
});

export const xmtpBaseMessageSchema = z.object({
  type: xmtpMessageTypeSchema,
  version: z.literal(1),
  vault: addressSchema,
  wallet: addressSchema,
  timestamp: z.number().int().positive(),
  proposalId: z.string().optional(),
  proposalHash: hashSchema.optional(),
  expiresAt: z.number().int().positive().optional(),
});

export const xmtpProposalMessageSchema = xmtpBaseMessageSchema.extend({
  type: z.literal("PROPOSAL"),
  proposalId: z.string().min(1),
  proposalHash: hashSchema,
  proposal: proposalSchema,
});

export const xmtpApprovalMessageSchema = xmtpBaseMessageSchema.extend({
  type: z.literal("APPROVAL"),
  proposalId: z.string().min(1),
  proposalHash: hashSchema,
  approvalScope: governedActionSchema,
});

export const xmtpRejectionMessageSchema = xmtpBaseMessageSchema.extend({
  type: z.literal("REJECTION"),
  proposalId: z.string().min(1),
  proposalHash: hashSchema,
  reason: z.string().min(1),
});

export type Proposal = z.infer<typeof proposalSchema>;
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;
export type WorldIdVerification = z.infer<typeof worldIdVerificationSchema>;
export type ExecutionAuthorization = z.infer<typeof executionAuthorizationSchema>;
export type WithdrawalAuthorization = z.infer<typeof withdrawalAuthorizationSchema>;
export type RecoveryAuthorization = z.infer<typeof recoveryAuthorizationSchema>;
export type XMTPProposalMessage = z.infer<typeof xmtpProposalMessageSchema>;
export type XMTPApprovalMessage = z.infer<typeof xmtpApprovalMessageSchema>;
export type XMTPRejectionMessage = z.infer<typeof xmtpRejectionMessageSchema>;
