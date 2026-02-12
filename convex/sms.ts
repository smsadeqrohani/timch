"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

const SMS_EVENTS = {
  ORDER_CREATED: "order_created",
  PAYMENT_CASH: "payment_cash",
  PAYMENT_INSTALLMENT: "payment_installment",
  MANUAL: "manual",
} as const;

const numberFormatter = new Intl.NumberFormat("fa-IR");

function formatAmount(value?: number | null) {
  if (value === undefined || value === null) {
    return "";
  }
  return numberFormatter.format(value);
}

/** شماره فاکتور برای نمایش در پیامک؛ در صورت نبود، شناسه سفارش */
function orderDisplayCode(order: { invoiceNumber?: number | null; _id: Id<"orders"> }) {
  return order.invoiceNumber != null ? String(order.invoiceNumber) : order._id;
}

async function fetchOrderAndCustomer(ctx: any, orderId: Id<"orders">) {
  const orderPayload = await ctx.runQuery(api.orders.getWithItems, { id: orderId });
  if (!orderPayload) {
    throw new Error("سفارش یافت نشد");
  }
  const customer = await ctx.runQuery(api.customers.get, { id: orderPayload.order.customerId });
  if (!customer) {
    throw new Error("مشتری سفارش یافت نشد");
  }
  return { order: orderPayload.order, customer };
}

const resolveEnv = (ctx: any, key: string) => ctx.env?.get(key) ?? process.env[key];

async function sendViaKavenegar(ctx: any, {
  message,
  receptor,
  senderOverride,
}: {
  message: string;
  receptor: string;
  senderOverride?: string;
}) {
  const apiKey = resolveEnv(ctx, "KAVENEGAR_API_KEY");
  if (!apiKey) {
    throw new Error("کلید Kavenegar در محیط تنظیم نشده است");
  }

  const sender =
    senderOverride ??
    resolveEnv(ctx, "KAVENEGAR_SENDER");

  if (!sender) {
    throw new Error("شماره ارسال‌کننده Kavenegar در محیط تنظیم نشده است");
  }

  // Build query string parameters (Kavenegar expects params in URL, not body)
  const params = new URLSearchParams({
    receptor,
    sender,
    message,
  });

  const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json?${params.toString()}`;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));
    const entry = Array.isArray(data?.entries) ? data.entries[0] : undefined;
    const success = data?.return?.status === 200;

    return {
      success,
      providerStatus: entry?.status ?? data?.return?.status,
      providerStatusText: entry?.statustext ?? data?.return?.message ?? "نامشخص",
      providerMessageId: entry?.messageid ? String(entry.messageid) : undefined,
      cost: entry?.cost,
      sender,
      rawResponse: JSON.stringify(data ?? {}),
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === "AbortError") {
      throw new Error("زمان اتصال به سرور Kavenegar به پایان رسید");
    }
    
    throw new Error(`خطا در ارتباط با Kavenegar: ${error.message}`);
  }
}

export const sendEvent = action({
  args: {
    event: v.union(
      v.literal(SMS_EVENTS.ORDER_CREATED),
      v.literal(SMS_EVENTS.PAYMENT_CASH),
      v.literal(SMS_EVENTS.PAYMENT_INSTALLMENT),
    ),
    orderId: v.id("orders"),
    agreementId: v.optional(v.id("installmentAgreements")),
  },
  returns: v.object({
    success: v.boolean(),
    statusText: v.string(),
  }),
  handler: async (ctx, args) => {
    const { order, customer } = await fetchOrderAndCustomer(ctx, args.orderId);

    let message = "";
    let metadata: Record<string, string> = {};

    if (args.event === SMS_EVENTS.ORDER_CREATED) {
      const invoiceCode = orderDisplayCode(order);
      message = `${customer.name} گرامی\n\nلطفاً به صندوق مراجعه کنید. شماره فاکتور شما: ${invoiceCode}`;
      metadata.orderCode = invoiceCode;
    } else if (args.event === SMS_EVENTS.PAYMENT_CASH) {
      const amountText = formatAmount(order.totalAmount);
      message = `${customer.name} گرامی\n\nسفارش شما ثبت شد (نقدی)`;
      metadata.amount = amountText;
    } else if (args.event === SMS_EVENTS.PAYMENT_INSTALLMENT) {
      if (!args.agreementId) {
        throw new Error("شناسه قرارداد اقساط ارسال نشده است");
      }
      const agreementData = await ctx.runQuery(api.installmentAgreements.getWithInstallments, {
        id: args.agreementId,
      });
      if (!agreementData) {
        throw new Error("قرارداد اقساط یافت نشد");
      }
      const nextInstallment = agreementData.installments
        .filter((installment) => installment.status === "در انتظار پرداخت")
        .sort((a, b) => a.installmentNumber - b.installmentNumber)[0];
      const downPaymentText = formatAmount(agreementData.agreement.downPayment);
      const nextAmountText = nextInstallment ? formatAmount(nextInstallment.installmentAmount) : "نامشخص";
      const nextDate = nextInstallment?.dueDate ?? "نامشخص";
      const invoiceCode = orderDisplayCode(order);
      message = `${customer.name} گرامی\n\nپرداخت اقساطی ثبت شد. شماره فاکتور: ${invoiceCode}. پیش‌پرداخت: ${downPaymentText} ریال. قسط بعدی: ${nextAmountText} ریال در تاریخ ${nextDate}`;
      metadata.downPayment = downPaymentText;
      metadata.nextInstallmentAmount = nextAmountText;
      metadata.nextInstallmentDate = nextDate;
      metadata.invoiceCode = invoiceCode;
    }

    const sendResult = await sendViaKavenegar(ctx, {
      message,
      receptor: customer.mobile,
    });

    await ctx.runMutation(internal.smsLogs.recordLog, {
      event: args.event,
      message,
      receptor: customer.mobile,
      sender: sendResult.sender,
      status: sendResult.success ? "success" : "failed",
      providerStatus: sendResult.providerStatus ?? undefined,
      providerStatusText: sendResult.providerStatusText,
      providerMessageId: sendResult.providerMessageId,
      cost: sendResult.cost ?? undefined,
      orderId: order._id,
      orderCode: orderDisplayCode(order),
      customerId: customer._id,
      customerName: customer.name,
      errorCode: sendResult.success ? undefined : sendResult.providerStatus,
      errorMessage: sendResult.success ? undefined : sendResult.providerStatusText,
      metadata: Object.keys(metadata).length ? JSON.stringify(metadata) : undefined,
    });

    return {
      success: sendResult.success,
      statusText: sendResult.providerStatusText ?? "ارسال شد",
    };
  },
});

export const sendManual = action({
  args: {
    receptor: v.string(),
    message: v.string(),
    orderId: v.optional(v.id("orders")),
    customerId: v.optional(v.id("customers")),
    sender: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    statusText: v.string(),
  }),
  handler: async (ctx, args) => {
    let customer: Doc<"customers"> | null = null;
    if (args.customerId) {
      customer = await ctx.runQuery(api.customers.get, { id: args.customerId });
    }

    // Format message with customer name if customer is provided
    let formattedMessage = args.message;
    if (customer) {
      formattedMessage = `${customer.name} گرامی\n\n${args.message}`;
    }

    const sendResult = await sendViaKavenegar(ctx, {
      message: formattedMessage,
      receptor: args.receptor,
      senderOverride: args.sender,
    });

    await ctx.runMutation(internal.smsLogs.recordLog, {
      event: SMS_EVENTS.MANUAL,
      message: formattedMessage, // Log the formatted message that was actually sent
      receptor: args.receptor,
      sender: sendResult.sender,
      status: sendResult.success ? "success" : "failed",
      providerStatus: sendResult.providerStatus ?? undefined,
      providerStatusText: sendResult.providerStatusText,
      providerMessageId: sendResult.providerMessageId,
      cost: sendResult.cost ?? undefined,
      orderId: args.orderId ?? undefined,
      orderCode: args.orderId ?? undefined,
      customerId: customer?._id ?? undefined,
      customerName: customer?.name ?? undefined,
      errorCode: sendResult.success ? undefined : sendResult.providerStatus,
      errorMessage: sendResult.success ? undefined : sendResult.providerStatusText,
      metadata: undefined,
    });

    return {
      success: sendResult.success,
      statusText: sendResult.providerStatusText ?? "ارسال شد",
    };
  },
});

