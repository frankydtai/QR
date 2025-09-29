import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface URLInputProps {
  onURLChange: (url: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function URLInput({ onURLChange, onContinue, onBack }: URLInputProps) {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const validateURL = (input: string): boolean => {
    if (!input.trim()) return false;
    
    try {
      new URL(input);
      return true;
    } catch {
      // Try adding https:// prefix
      try {
        new URL(`https://${input}`);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    
    const valid = validateURL(value);
    setIsValid(value ? valid : null);
    
    if (valid) {
      // Ensure URL has protocol
      const finalUrl = value.startsWith('http://') || value.startsWith('https://') 
        ? value 
        : `https://${value}`;
      onURLChange(finalUrl);
      console.log('Valid URL entered:', finalUrl);
    }
  };

  const getValidationIcon = () => {
    if (isValid === null) return null;
    if (isValid) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-destructive" />;
  };

  const getValidationMessage = () => {
    if (isValid === null) return null;
    if (isValid) {
      return <p className="text-sm text-green-600 mt-2">Valid URL</p>;
    }
    return <p className="text-sm text-destructive mt-2">Please enter a valid URL</p>;
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold mb-2" data-testid="page-title">
          Enter URL
        </h1>
        <p className="text-muted-foreground">
          What should your QR code link to?
        </p>
      </div>

      <div className="mb-8">
        <Label htmlFor="url-input" className="text-base font-medium">
          Website URL
        </Label>
        <div className="relative mt-2">
          <Input
            id="url-input"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={handleURLChange}
            className="h-12 pr-12"
            data-testid="input-url"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getValidationIcon()}
          </div>
        </div>
        {getValidationMessage()}
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Examples:</strong>
          </p>
          <div className="text-sm text-muted-foreground mt-1 space-y-1">
            <div>• https://example.com</div>
            <div>• example.com</div>
            <div>• mailto:hello@example.com</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12"
          data-testid="button-back"
        >
          Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={!isValid}
          className="flex-1 h-12"
          data-testid="button-continue"
        >
          Generate QR
        </Button>
      </div>
    </div>
  );
}