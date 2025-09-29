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
      <button 
        onClick={onBack}
        className="mb-6 text-white/80 hover:text-white transition-colors"
        data-testid="button-back"
      >
        ← Back
      </button>
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-light mb-2 text-white" data-testid="page-title">
          Enter URL
        </h1>
      </div>

      <div className="mb-8">
        <Label htmlFor="url-input" className="text-base font-medium text-white">
          Website URL
        </Label>
        <div className="relative mt-2">
          <Input
            id="url-input"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={handleURLChange}
            className="h-12 pr-12 bg-white/10 border-white/30 text-white placeholder:text-white/60"
            data-testid="input-url"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getValidationIcon()}
          </div>
        </div>
        {getValidationMessage()}
        
      </div>

      <Button
        onClick={onContinue}
        disabled={!isValid}
        className="w-full h-12 bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-50"
        data-testid="button-continue"
      >
        Generate QR
      </Button>
    </div>
  );
}