import React, { useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { usePermissions } from "../hooks/usePermissions";
import { Id } from "../../convex/_generated/dataModel";

const toEnglishNumbers = (value: string) =>
  value.replace(/[۰-۹]/g, (char) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(char)));

const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString("fa-IR");

const statusStyles: Record<string, string> = {
  success: "bg-green-900/30 text-green-300 border border-green-500/30",
  failed: "bg-red-900/30 text-red-300 border border-red-500/30",
};

export default function SmsPage() {
  const logs = useQuery(api.smsLogs.list);
  const customers = useQuery(api.customers.list);
  const sendManualSms = useAction(api.sms.sendManual);
  const { hasPermission } = usePermissions();
  const canSendSms = hasPermission("sms:send");

  const [recipientType, setRecipientType] = useState<"phone" | "customer">("phone");
  const [manualNumber, setManualNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<Id<"customers"> | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const orderedLogs = useMemo(() => logs ?? [], [logs]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customers || !customerSearch.trim()) return [];
    const search = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.mobile.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const handleManualSend = async () => {
    let receptor = "";
    let customerId: Id<"customers"> | undefined = undefined;

    if (recipientType === "phone") {
      receptor = toEnglishNumbers(manualNumber).trim();
      if (!receptor.match(/^09\d{9}$/)) {
        setFeedback({ type: "error", text: "شماره موبایل باید با 09 شروع شود و 11 رقم باشد." });
        return;
      }
    } else {
      if (!selectedCustomerId) {
        setFeedback({ type: "error", text: "لطفاً مشتری را انتخاب کنید." });
        return;
      }
      const customer = customers?.find((c) => c._id === selectedCustomerId);
      if (!customer) {
        setFeedback({ type: "error", text: "مشتری یافت نشد." });
        return;
      }
      receptor = customer.mobile;
      customerId = selectedCustomerId;
    }

    if (!manualMessage.trim()) {
      setFeedback({ type: "error", text: "متن پیام را وارد کنید." });
      return;
    }

    try {
      setIsSending(true);
      setFeedback(null);
      const result = await sendManualSms({
        receptor,
        message: manualMessage.trim(),
        customerId,
      });
      setFeedback({
        type: result.success ? "success" : "error",
        text: result.statusText,
      });
      if (result.success) {
        setManualNumber("");
        setManualMessage("");
        setSelectedCustomerId(null);
        setCustomerSearch("");
      }
    } catch (error: any) {
      setFeedback({
        type: "error",
        text: error?.message || "خطا در ارسال پیامک",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400">
          مدیریت پیامک‌ها
        </h1>
        <p className="text-gray-400">
          ارسال پیام فوری و مشاهده وضعیت پیامک‌های سیستمی
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-6">
        <div className="glass-card p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡️</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">ارسال فوری پیامک</h2>
              <p className="text-sm text-gray-400">
                برای ارسال پیام خارج از رویدادهای سیستمی استفاده کنید.
              </p>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg text-sm ${
                feedback.type === "success"
                  ? "bg-green-900/30 border border-green-600/40 text-green-200"
                  : "bg-red-900/30 border border-red-600/40 text-red-200"
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="space-y-4">
            {/* Recipient Type Toggle */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">نوع گیرنده *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recipientType"
                    value="phone"
                    checked={recipientType === "phone"}
                    onChange={(e) => {
                      setRecipientType("phone");
                      setSelectedCustomerId(null);
                      setCustomerSearch("");
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-300">شماره موبایل</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recipientType"
                    value="customer"
                    checked={recipientType === "customer"}
                    onChange={(e) => {
                      setRecipientType("customer");
                      setManualNumber("");
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-300">مشتری</span>
                </label>
              </div>
            </div>

            {/* Phone Number Input */}
            {recipientType === "phone" && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">شماره گیرنده *</label>
                <input
                  type="tel"
                  value={manualNumber}
                  onChange={(event) => setManualNumber(event.target.value)}
                  placeholder="09xxxxxxxxx"
                  className="auth-input-field"
                  dir="ltr"
                />
              </div>
            )}

            {/* Customer Selection */}
            {recipientType === "customer" && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">انتخاب مشتری *</label>
                {!selectedCustomerId ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="جستجو بر اساس نام یا شماره موبایل"
                      className="auth-input-field"
                      dir="rtl"
                    />
                    {customerSearch && filteredCustomers.length > 0 && (
                      <div className="border border-gray-600 rounded-md max-h-40 overflow-y-auto bg-gray-800/50">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer._id}
                            className="p-3 hover:bg-gray-700/50 cursor-pointer border-b border-gray-600 last:border-b-0"
                            onClick={() => {
                              setSelectedCustomerId(customer._id);
                              setCustomerSearch("");
                            }}
                          >
                            <div className="font-medium text-gray-200">{customer.name}</div>
                            <div className="text-sm text-gray-400">{customer.mobile}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-500/30 rounded-md">
                    <div>
                      <div className="font-medium text-green-400">
                        {customers?.find((c) => c._id === selectedCustomerId)?.name}
                      </div>
                      <div className="text-sm text-gray-300">
                        {customers?.find((c) => c._id === selectedCustomerId)?.mobile}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(null);
                        setCustomerSearch("");
                      }}
                      className="btn-secondary text-sm"
                    >
                      تغییر
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-300 mb-2">متن پیام *</label>
              <textarea
                value={manualMessage}
                onChange={(event) => setManualMessage(event.target.value)}
                rows={4}
                className="auth-input-field"
                placeholder="متن پیام را وارد کنید..."
              />
              {recipientType === "customer" && selectedCustomerId && (
                <p className="text-xs text-gray-400 mt-1">
                  نام مشتری به صورت خودکار در ابتدای پیام اضافه می‌شود
                </p>
              )}
            </div>

            <button
              onClick={handleManualSend}
              disabled={isSending || !canSendSms}
              className="auth-button w-full disabled:opacity-60"
            >
              {!canSendSms ? "دسترسی ارسال ندارید" : isSending ? "در حال ارسال..." : "ارسال پیامک"}
            </button>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">گزارش ارسال‌ها</h2>
              <p className="text-sm text-gray-400">۲۰۰ مورد آخر نمایش داده می‌شود</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700/50">
                  <th className="py-2 text-right">زمان</th>
                  <th className="py-2 text-right">گیرنده</th>
                  <th className="py-2 text-right">پیام</th>
                  <th className="py-2 text-right">وضعیت</th>
                  <th className="py-2 text-right">رویداد</th>
                </tr>
              </thead>
              <tbody>
                {orderedLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      هنوز پیامکی ارسال نشده است.
                    </td>
                  </tr>
                )}
                {orderedLogs.map((log) => (
                  <tr key={log._id} className="border-b border-gray-800/60 last:border-b-0">
                    <td className="py-3 text-gray-300 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-3 text-gray-200">{log.receptor}</td>
                    <td className="py-3 text-gray-300 max-w-xs">
                      <div className="truncate" title={log.message}>
                        {log.message}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-md text-xs ${statusStyles[log.status] ?? "bg-gray-800/50 text-gray-300"}`}>
                        {log.status === "success" ? "ارسال موفق" : "ارسال ناموفق"}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 text-xs">
                      {log.event}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

