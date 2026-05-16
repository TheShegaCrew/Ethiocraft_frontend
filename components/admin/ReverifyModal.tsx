"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { toast } from "react-toastify";
import { AlertCircle } from "lucide-react";

type ReverifyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sampleId: string;
  sampleTitle?: string;
  onSuccess?: () => void;
};

export function ReverifyModal({
  open,
  onOpenChange,
  sampleId,
  sampleTitle,
  onSuccess,
}: ReverifyModalProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please provide a reason for requesting re-verification.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/admin/samples/${sampleId}/re-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Failed: ${res.status}`);
      }

      toast.success("Re-verification requested. The artisan has been notified.");
      setMessage("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to request re-verification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base uppercase tracking-wider font-semibold">
            Request Re-verification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">
                Sample will be set to <span className="font-mono">MORE_INFO_REQUESTED</span>
              </p>
              {sampleTitle && (
                <p className="text-amber-700 mt-0.5 truncate">
                  &quot;{sampleTitle}&quot;
                </p>
              )}
              <p className="text-amber-600 mt-1 text-xs">
                The artisan will receive an in-app notification with your message.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reason / Instructions <span className="text-destructive">*</span>
            </label>
            <textarea
              maxLength={1000}
              className="w-full p-2.5 border border-border rounded-md bg-background text-sm min-h-[140px] resize-y"
              placeholder="Explain what needs to be corrected or provided for re-verification. E.g., 'Please upload clearer photos of the product from different angles and provide the exact dimensions.'"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? "Requesting..." : "Request Re-verify"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
