import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';

interface ConfirmURLModalProps {
  isOpen: boolean;
  url: string;
  onConfirm: () => void;
  onBack: () => void;
}

export default function ConfirmURLModal({ isOpen, url, onConfirm, onBack }: ConfirmURLModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-white/20 p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-light text-white" data-testid="modal-title">
            Confirm URL
          </h2>
          <button
            onClick={onBack}
            className="text-white/60 hover:text-white transition-colors"
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-white/80 text-sm mb-3">
            Is this URL correct?
          </p>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-white font-mono text-sm break-all" data-testid="display-url">
              {url}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12 bg-white/10 border-white/30 text-white hover:bg-white/20"
            data-testid="button-modal-back"
          >
            Back
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 h-12 bg-white/20 border border-white/30 text-white hover:bg-white/30"
            data-testid="button-modal-confirm"
          >
            Confirm
          </Button>
        </div>
      </Card>
    </div>
  );
}