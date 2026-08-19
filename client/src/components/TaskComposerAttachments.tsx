import { FileText, X } from "lucide-react";
import React from "react";

export type ComposerAttachment = {
  id: string;
  sourceType: "upload" | "library";
  filename: string;
  fileType: string;
  storageKey?: string;
  storageUrl?: string;
  sourceDeliverableId?: string;
};

export function TaskComposerAttachments({ attachments, onRemove }: {
  attachments: ComposerAttachment[];
  onRemove: (id: string) => void;
}) {
  if (!attachments.length) return null;
  return <div className="synthia-attachment-chips" aria-label="Attached files">{attachments.map(attachment => <span key={attachment.id} className="synthia-attachment-chip"><FileText size={13} /><span title={attachment.filename}>{attachment.filename}</span><button type="button" onClick={() => onRemove(attachment.id)} aria-label={`Remove ${attachment.filename}`}><X size={13} /></button></span>)}</div>;
}
