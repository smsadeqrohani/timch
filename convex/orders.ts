import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getInstallmentDueDateFromAgreement } from "./dateUtils";

// Order status constants
export const ORDER_STATUS = {
  PENDING_CASHIER: "در انتظار صندوق",
  APPROVED: "تایید شده",
  CANCELLED: "لغو شده",
} as const;

// Payment type constants
export const PAYMENT_TYPE = {
  CASH: "نقدی",
  INSTALLMENT: "اقساط",
} as const;

// Order item structure
const orderItemSchema = v.object({
  productId: v.id("products"),
  color: v.string(),
  sizeX: v.number(),
  sizeY: v.number(),
  quantity: v.number(),
});

// Get all orders
export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("orders"),
    _creationTime: v.number(),
    customerId: v.id("customers"),
    createdBy: v.id("users"),
    status: v.string(),
    paymentType: v.optional(v.string()),
    totalAmount: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    cashierId: v.optional(v.id("users")),
    processedAt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    
    // Sort orders by creation date (newest first)
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get orders by status
export const getByStatus = query({
  args: { status: v.string() },
  returns: v.array(v.object({
    _id: v.id("orders"),
    _creationTime: v.number(),
    customerId: v.id("customers"),
    createdBy: v.id("users"),
    status: v.string(),
    paymentType: v.optional(v.string()),
    totalAmount: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    cashierId: v.optional(v.id("users")),
    processedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("byStatus", (q) => q.eq("status", args.status))
      .collect();
    
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get orders by customer
export const getByCustomer = query({
  args: { customerId: v.id("customers") },
  returns: v.array(v.object({
    _id: v.id("orders"),
    _creationTime: v.number(),
    customerId: v.id("customers"),
    createdBy: v.id("users"),
    status: v.string(),
    paymentType: v.optional(v.string()),
    totalAmount: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    cashierId: v.optional(v.id("users")),
    processedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("byCustomerId", (q) => q.eq("customerId", args.customerId))
      .collect();
    
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get order by ID with items
export const getWithItems = query({
  args: { id: v.id("orders") },
  returns: v.union(
    v.object({
      order: v.object({
        _id: v.id("orders"),
        _creationTime: v.number(),
        customerId: v.id("customers"),
        createdBy: v.id("users"),
        status: v.string(),
        paymentType: v.optional(v.string()),
        totalAmount: v.number(),
        notes: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
        cashierId: v.optional(v.id("users")),
        processedAt: v.optional(v.number()),
      }),
      items: v.array(v.object({
        _id: v.id("orderItems"),
        _creationTime: v.number(),
        orderId: v.id("orders"),
        productId: v.id("products"),
        color: v.string(),
        sizeX: v.number(),
        sizeY: v.number(),
        quantity: v.number(),
        price: v.optional(v.number()),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("byOrderId", (q) => q.eq("orderId", args.id))
      .collect();

    return { order, items };
  },
});

export const getItemsForOrders = query({
  args: { orderIds: v.array(v.id("orders")) },
  returns: v.array(
    v.object({
      orderId: v.id("orders"),
      items: v.array(
        v.object({
          _id: v.id("orderItems"),
          _creationTime: v.number(),
          orderId: v.id("orders"),
          productId: v.id("products"),
          color: v.string(),
          sizeX: v.number(),
          sizeY: v.number(),
          quantity: v.number(),
          price: v.optional(v.number()),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const entries = await Promise.all(
      args.orderIds.map(async (orderId) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("byOrderId", (q) => q.eq("orderId", orderId))
          .collect();
        return { orderId, items };
      })
    );

    return entries;
  },
});

// Create new order
export const create = mutation({
  args: {
    customerId: v.id("customers"),
    createdBy: v.id("users"),
    items: v.array(orderItemSchema),
    notes: v.optional(v.string()),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Calculate total amount (for now, we'll use a simple calculation)
    // In a real app, you'd calculate based on product prices
    const totalAmount = args.items.reduce((total, item) => {
      return total + (item.sizeX * item.sizeY * item.quantity);
    }, 0);

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      customerId: args.customerId,
      createdBy: args.createdBy,
      status: ORDER_STATUS.PENDING_CASHIER,
      totalAmount,
      notes: args.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    });

    // Create order items
    for (const item of args.items) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        color: item.color,
        sizeX: item.sizeX,
        sizeY: item.sizeY,
        quantity: item.quantity,
      });
    }

    return orderId;
  },
});

// Update order status (for cashier)
export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.string(),
    paymentType: v.optional(v.string()),
    cashierId: v.id("users"),
    totalAmount: v.optional(v.number()),
    itemPrices: v.optional(v.array(v.object({ itemId: v.id("orderItems"), price: v.number() }))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const updateData: any = {
      status: args.status,
      paymentType: args.paymentType,
      cashierId: args.cashierId,
      processedAt: now,
      updatedAt: now,
    };

    // Update total amount if provided
    if (args.totalAmount !== undefined) {
      updateData.totalAmount = args.totalAmount;
    }
    
    await ctx.db.patch(args.id, updateData);

    // Update item prices when provided
    if (args.itemPrices && args.itemPrices.length > 0) {
      for (const { itemId, price } of args.itemPrices) {
        await ctx.db.patch(itemId, { price });
      }
    }

    return null;
  },
});

// Create installment agreement for order
export const createInstallmentAgreement = mutation({
  args: {
    orderId: v.id("orders"),
    totalAmount: v.number(),
    downPayment: v.number(),
    numberOfInstallments: v.number(),
    annualRate: v.number(),
    guaranteeType: v.string(),
    agreementDate: v.string(),
    createdBy: v.id("users"),
    itemPrices: v.optional(v.array(v.object({ itemId: v.id("orderItems"), price: v.number() }))),
  },
  returns: v.id("installmentAgreements"),
  handler: async (ctx, args) => {
    // Get the order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("سفارش یافت نشد");
    }

    const customer = await ctx.db.get(order.customerId);
    if (!customer) {
      throw new Error("مشتری مرتبط با سفارش یافت نشد");
    }
    if (!customer.nationalCode) {
      throw new Error("برای ثبت قرارداد اقساط، کد ملی مشتری باید ثبت شده باشد");
    }

    // Create the installment agreement directly
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
      customerId: order.customerId,
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
      status: "در انتظار پرداخت",
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
      
      // Due date = agreement date + i months (first installment = 1 month after agreement)
      const jalaliDueDate = getInstallmentDueDateFromAgreement(args.agreementDate, i);
      
      await ctx.db.insert("installments", {
        agreementId,
        installmentNumber: i,
        dueDate: jalaliDueDate,
        installmentAmount,
        interestAmount,
        principalAmount: principalAmountForThisMonth,
        remainingBalance,
        status: "در انتظار پرداخت",
      });
    }

    // Update order payment type to installment and status to approved
    // Also update the total amount to match the installment agreement total
    await ctx.db.patch(args.orderId, {
      paymentType: PAYMENT_TYPE.INSTALLMENT,
      status: ORDER_STATUS.APPROVED,
      totalAmount: args.totalAmount, // Use the total amount from the installment agreement
      cashierId: args.createdBy, // The person who created the installment agreement
      processedAt: now,
      updatedAt: now,
    });

    // Update item prices when provided
    if (args.itemPrices && args.itemPrices.length > 0) {
      for (const { itemId, price } of args.itemPrices) {
        await ctx.db.patch(itemId, { price });
      }
    }

    return agreementId;
  },
});

// Update order (general update)
export const update = mutation({
  args: {
    id: v.id("orders"),
    customerId: v.optional(v.id("customers")),
    notes: v.optional(v.string()),
    items: v.optional(v.array(orderItemSchema)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Only allow updates if order is still pending
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error("سفارش یافت نشد");
    }
    
    if (order.status !== ORDER_STATUS.PENDING_CASHIER) {
      throw new Error("فقط سفارشات در انتظار صندوق قابل ویرایش هستند");
    }

    const updateData: any = {
      updatedAt: now,
    };

    if (args.customerId) {
      updateData.customerId = args.customerId;
    }

    if (args.notes !== undefined) {
      updateData.notes = args.notes?.trim();
    }

    // Update items if provided
    if (args.items) {
      // Delete existing items
      const existingItems = await ctx.db
        .query("orderItems")
        .withIndex("byOrderId", (q) => q.eq("orderId", args.id))
        .collect();

      for (const item of existingItems) {
        await ctx.db.delete(item._id);
      }

      // Create new items
      for (const item of args.items) {
        await ctx.db.insert("orderItems", {
          orderId: args.id,
          productId: item.productId,
          color: item.color,
          sizeX: item.sizeX,
          sizeY: item.sizeY,
          quantity: item.quantity,
        });
      }

      // Recalculate total amount
      const totalAmount = args.items.reduce((total, item) => {
        return total + (item.sizeX * item.sizeY * item.quantity);
      }, 0);
      updateData.totalAmount = totalAmount;
    }

    await ctx.db.patch(args.id, updateData);
    return null;
  },
});

// Delete order
export const remove = mutation({
  args: { id: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Only allow deletion if order is still pending
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error("سفارش یافت نشد");
    }
    
    if (order.status !== ORDER_STATUS.PENDING_CASHIER) {
      throw new Error("فقط سفارشات در انتظار صندوق قابل حذف هستند");
    }

    // Delete order items first
    const items = await ctx.db
      .query("orderItems")
      .withIndex("byOrderId", (q) => q.eq("orderId", args.id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete the order
    await ctx.db.delete(args.id);
    return null;
  },
});

// Get orders statistics
export const getStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    pending: v.number(),
    approved: v.number(),
    cancelled: v.number(),
    totalAmount: v.number(),
  }),
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === ORDER_STATUS.PENDING_CASHIER).length,
      approved: orders.filter(o => o.status === ORDER_STATUS.APPROVED).length,
      cancelled: orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length,
      totalAmount: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    };

    return stats;
  },
});

// Get pending orders for cashier
export const getPendingForCashier = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("orders"),
    _creationTime: v.number(),
    customerId: v.id("customers"),
    createdBy: v.id("users"),
    status: v.string(),
    paymentType: v.optional(v.string()),
    totalAmount: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    cashierId: v.optional(v.id("users")),
    processedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("byStatus", (q) => q.eq("status", ORDER_STATUS.PENDING_CASHIER))
      .collect();
    
    return orders.sort((a, b) => a.createdAt - b.createdAt); // Oldest first for cashier
  },
});

