import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Installment agreement status constants
export const AGREEMENT_STATUS = {
  PENDING: "در انتظار پرداخت",
  APPROVED: "تایید شده",
  COMPLETED: "تکمیل شده",
  CANCELLED: "لغو شده",
} as const;

// Installment status constants
export const INSTALLMENT_STATUS = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت شده",
  OVERDUE: "سررسید گذشته",
} as const;

// Create installment agreement
export const create = mutation({
  args: {
    orderId: v.id("orders"),
    customerId: v.id("customers"),
    totalAmount: v.number(),
    downPayment: v.number(),
    numberOfInstallments: v.number(),
    annualRate: v.number(),
    guaranteeType: v.string(),
    agreementDate: v.string(),
    createdBy: v.id("users"),
  },
  returns: v.id("installmentAgreements"),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Calculate installment details
    const principalAmount = args.totalAmount - args.downPayment;
    const monthlyRate = args.annualRate / 12 / 100;
    
    // Calculate fixed installment amount using annuity formula
    let installmentAmount: number;
    if (monthlyRate === 0) {
      installmentAmount = principalAmount / args.numberOfInstallments;
    } else {
      const numerator = principalAmount * monthlyRate * Math.pow(1 + monthlyRate, args.numberOfInstallments);
      const denominator = Math.pow(1 + monthlyRate, args.numberOfInstallments) - 1;
      installmentAmount = numerator / denominator;
    }
    
    // Round to nearest 100,000 Rials
    installmentAmount = Math.round(installmentAmount / 100000) * 100000;
    
    const totalPayment = installmentAmount * args.numberOfInstallments;
    const totalInterest = totalPayment - principalAmount;

    // Create the agreement
    const agreementId = await ctx.db.insert("installmentAgreements", {
      orderId: args.orderId,
      customerId: args.customerId,
      totalAmount: args.totalAmount,
      downPayment: args.downPayment,
      principalAmount,
      numberOfInstallments: args.numberOfInstallments,
      annualRate: args.annualRate,
      monthlyRate: monthlyRate * 100, // Convert back to percentage
      installmentAmount,
      totalInterest,
      totalPayment,
      guaranteeType: args.guaranteeType,
      agreementDate: args.agreementDate,
      status: AGREEMENT_STATUS.PENDING,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    // Create individual installments
    let remainingBalance = principalAmount;
    for (let i = 1; i <= args.numberOfInstallments; i++) {
      const interestAmount = Math.round(remainingBalance * monthlyRate);
      let principalAmountForThisMonth = installmentAmount - interestAmount;
      
      // Adjust for rounding in last installment
      if (i === args.numberOfInstallments) {
        principalAmountForThisMonth = remainingBalance;
      }
      
      remainingBalance = Math.max(0, remainingBalance - principalAmountForThisMonth);
      
      // Calculate due date (assuming monthly installments)
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      const jalaliDueDate = formatJalaliDate(dueDate);
      
      await ctx.db.insert("installments", {
        agreementId,
        installmentNumber: i,
        dueDate: jalaliDueDate,
        installmentAmount,
        interestAmount,
        principalAmount: principalAmountForThisMonth,
        remainingBalance,
        status: INSTALLMENT_STATUS.PENDING,
      });
    }

    return agreementId;
  },
});

// Get agreement by order ID
export const getByOrderId = query({
  args: { orderId: v.id("orders") },
  returns: v.union(
    v.object({
      agreement: v.object({
        _id: v.id("installmentAgreements"),
        _creationTime: v.number(),
        orderId: v.id("orders"),
        customerId: v.id("customers"),
        totalAmount: v.number(),
        downPayment: v.number(),
        principalAmount: v.number(),
        numberOfInstallments: v.number(),
        annualRate: v.number(),
        monthlyRate: v.number(),
        installmentAmount: v.number(),
        totalInterest: v.number(),
        totalPayment: v.number(),
        guaranteeType: v.string(),
        agreementDate: v.string(),
        status: v.string(),
        createdBy: v.id("users"),
        approvedBy: v.optional(v.id("users")),
        createdAt: v.number(),
        updatedAt: v.number(),
        approvedAt: v.optional(v.number()),
      }),
      installments: v.array(v.object({
        _id: v.id("installments"),
        _creationTime: v.number(),
        agreementId: v.id("installmentAgreements"),
        installmentNumber: v.number(),
        dueDate: v.string(),
        installmentAmount: v.number(),
        interestAmount: v.number(),
        principalAmount: v.number(),
        remainingBalance: v.number(),
        status: v.string(),
        paidAt: v.optional(v.number()),
        paidBy: v.optional(v.id("users")),
        notes: v.optional(v.string()),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const agreement = await ctx.db
      .query("installmentAgreements")
      .withIndex("byOrderId", (q) => q.eq("orderId", args.orderId))
      .first();
    
    if (!agreement) return null;

    const installments = await ctx.db
      .query("installments")
      .withIndex("byAgreementId", (q) => q.eq("agreementId", agreement._id))
      .collect();

    return { agreement, installments };
  },
});

// Get agreement by ID with installments
export const getWithInstallments = query({
  args: { id: v.id("installmentAgreements") },
  returns: v.union(
    v.object({
      agreement: v.object({
        _id: v.id("installmentAgreements"),
        _creationTime: v.number(),
        orderId: v.id("orders"),
        customerId: v.id("customers"),
        totalAmount: v.number(),
        downPayment: v.number(),
        principalAmount: v.number(),
        numberOfInstallments: v.number(),
        annualRate: v.number(),
        monthlyRate: v.number(),
        installmentAmount: v.number(),
        totalInterest: v.number(),
        totalPayment: v.number(),
        guaranteeType: v.string(),
        agreementDate: v.string(),
        status: v.string(),
        createdBy: v.id("users"),
        approvedBy: v.optional(v.id("users")),
        createdAt: v.number(),
        updatedAt: v.number(),
        approvedAt: v.optional(v.number()),
      }),
      installments: v.array(v.object({
        _id: v.id("installments"),
        _creationTime: v.number(),
        agreementId: v.id("installmentAgreements"),
        installmentNumber: v.number(),
        dueDate: v.string(),
        installmentAmount: v.number(),
        interestAmount: v.number(),
        principalAmount: v.number(),
        remainingBalance: v.number(),
        status: v.string(),
        paidAt: v.optional(v.number()),
        paidBy: v.optional(v.id("users")),
        notes: v.optional(v.string()),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const agreement = await ctx.db.get(args.id);
    if (!agreement) return null;

    const installments = await ctx.db
      .query("installments")
      .withIndex("byAgreementId", (q) => q.eq("agreementId", args.id))
      .collect();

    return { agreement, installments };
  },
});

// Approve agreement
export const approve = mutation({
  args: {
    id: v.id("installmentAgreements"),
    approvedBy: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.patch(args.id, {
      status: AGREEMENT_STATUS.APPROVED,
      approvedBy: args.approvedBy,
      approvedAt: now,
      updatedAt: now,
    });

    return null;
  },
});

// Cancel agreement
export const cancel = mutation({
  args: {
    id: v.id("installmentAgreements"),
    cancelledBy: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.patch(args.id, {
      status: AGREEMENT_STATUS.CANCELLED,
      updatedAt: now,
    });

    return null;
  },
});

// Mark installment as paid
export const markInstallmentPaid = mutation({
  args: {
    installmentId: v.id("installments"),
    paidBy: v.id("users"),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.patch(args.installmentId, {
      status: INSTALLMENT_STATUS.PAID,
      paidAt: now,
      paidBy: args.paidBy,
      notes: args.notes,
    });

    return null;
  },
});

// Get all agreements
export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("installmentAgreements"),
    _creationTime: v.number(),
    orderId: v.id("orders"),
    customerId: v.id("customers"),
    totalAmount: v.number(),
    downPayment: v.number(),
    principalAmount: v.number(),
    numberOfInstallments: v.number(),
    annualRate: v.number(),
    monthlyRate: v.number(),
    installmentAmount: v.number(),
    totalInterest: v.number(),
    totalPayment: v.number(),
    guaranteeType: v.string(),
    agreementDate: v.string(),
    status: v.string(),
    createdBy: v.id("users"),
    approvedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    const agreements = await ctx.db.query("installmentAgreements").collect();
    return agreements.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get agreements by status
export const getByStatus = query({
  args: { status: v.string() },
  returns: v.array(v.object({
    _id: v.id("installmentAgreements"),
    _creationTime: v.number(),
    orderId: v.id("orders"),
    customerId: v.id("customers"),
    totalAmount: v.number(),
    downPayment: v.number(),
    principalAmount: v.number(),
    numberOfInstallments: v.number(),
    annualRate: v.number(),
    monthlyRate: v.number(),
    installmentAmount: v.number(),
    totalInterest: v.number(),
    totalPayment: v.number(),
    guaranteeType: v.string(),
    agreementDate: v.string(),
    status: v.string(),
    createdBy: v.id("users"),
    approvedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const agreements = await ctx.db
      .query("installmentAgreements")
      .withIndex("byStatus", (q) => q.eq("status", args.status))
      .collect();
    
    return agreements.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Mark installment as paid
export const markInstallmentAsPaid = mutation({
  args: {
    installmentId: v.id("installments"),
    paidBy: v.id("users"),
    paidAmount: v.number(),
    paymentDate: v.string(), // Jalali date
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const installment = await ctx.db.get(args.installmentId);
    if (!installment) {
      throw new Error("Installment not found");
    }

    if (installment.status === "پرداخت شده") {
      throw new Error("Installment already paid");
    }

    // Validate payment amount
    if (args.paidAmount < installment.installmentAmount) {
      throw new Error("Payment amount is less than required installment amount");
    }

    const now = Date.now();
    await ctx.db.patch(args.installmentId, {
      status: "پرداخت شده",
      paidAt: now,
      paidBy: args.paidBy,
      notes: args.notes,
    });

    // Update agreement status if all installments are paid
    const agreement = await ctx.db.get(installment.agreementId);
    if (agreement) {
      const allInstallments = await ctx.db
        .query("installments")
        .withIndex("byAgreementId", (q) => q.eq("agreementId", installment.agreementId))
        .collect();

      const allPaid = allInstallments.every(inst => inst.status === "پرداخت شده");
      if (allPaid) {
        await ctx.db.patch(installment.agreementId, {
          status: AGREEMENT_STATUS.COMPLETED,
          updatedAt: now,
        });
      }
    }

    return { 
      success: true, 
      paidAt: now,
      paymentDate: args.paymentDate,
      paidAmount: args.paidAmount,
    };
  },
});

// Helper function to format Jalali date
function formatJalaliDate(date: Date): string {
  // This is a simplified version - you might want to use a proper Jalali date library
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}
