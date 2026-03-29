import { xmtpApprovalMessageSchema, xmtpProposalMessageSchema, xmtpRejectionMessageSchema } from "./schemas";

export function serializeXMTPMessage(payload: unknown) {
  return JSON.stringify(payload);
}

export function parseXMTPProposalMessage(raw: string) {
  return xmtpProposalMessageSchema.parse(JSON.parse(raw));
}

export function parseXMTPApprovalMessage(raw: string) {
  return xmtpApprovalMessageSchema.parse(JSON.parse(raw));
}

export function parseXMTPRejectionMessage(raw: string) {
  return xmtpRejectionMessageSchema.parse(JSON.parse(raw));
}
