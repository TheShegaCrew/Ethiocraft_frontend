"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { toast } from "react-toastify";

type MessagePanelModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
};

const NOTIFICATION_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "ORDER_PLACED", label: "Order" },
  { value: "PAYMENT_SUCCESS", label: "Payment" },
  { value: "PRODUCT_APPROVED", label: "Product Approved" },
  { value: "PRODUCT_REJECTED", label: "Product Rejected" },
];

export function MessagePanelModal({
  open,
  onOpenChange,
  userId,
  userName,
}: MessagePanelModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("GENERAL");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and message.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/admin/users/${userId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), type }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Failed: ${res.status}`);
      }

      toast.success(`Notification sent to ${userName || "user"} successfully.`);
      setTitle("");
      setMessage("");
      setType("GENERAL");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base uppercase tracking-wider font-semibold">
            Send Notification
            {userName && (
              <span className="ml-2 text-muted-foreground font-normal normal-case text-sm">
                → {userName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Type
            </label>
            <select
              className="w-full p-2.5 border border-border rounded-md bg-background text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              maxLength={100}
              className="w-full p-2.5 border border-border rounded-md bg-background text-sm"
              placeholder="e.g. Important update regarding your order"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Message <span className="text-destructive">*</span>
            </label>
            <textarea
              maxLength={1000}
              className="w-full p-2.5 border border-border rounded-md bg-background text-sm min-h-[120px] resize-y"
              placeholder="Write your message to the user here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? "Sending..." : "Send Notification"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
