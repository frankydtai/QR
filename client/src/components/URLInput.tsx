import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Instagram, Facebook, Globe, Crown } from 'lucide-react';

interface URLInputProps {
  onURLChange: (url: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

type URLType = 'instagram' | 'facebook' | 'custom';

export default function URLInput({ onURLChange, onContinue, onBack }: URLInputProps) {
  const [selectedType, setSelectedType] = useState<URLType | null>(null);
  const [username, setUsername] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [isValid, setIsValid] = useState<boolean>(false);

  const validateAndSetURL = (type: URLType, value: string) => {
    let finalUrl = '';
    let valid = false;

    if (type === 'instagram') {
      if (value.trim()) {
        finalUrl = `https://instagram.com/${value.trim()}`;
        valid = true;
      }
    } else if (type === 'facebook') {
      if (value.trim()) {
        finalUrl = `https://facebook.com/${value.trim()}`;
        valid = true;
      }
    } else if (type === 'custom') {
      if (value.trim()) {
        try {
          new URL(value);
          finalUrl = value;
          valid = true;
        } catch {
          try {
            new URL(`https://${value}`);
            finalUrl = `https://${value}`;
            valid = true;
          } catch {
            valid = false;
          }
        }
      }
    }

    setIsValid(valid);
    if (valid) {
      onURLChange(finalUrl);
      console.log('URL set:', finalUrl);
    }
  };

  const handleTypeSelect = (type: URLType) => {
    setSelectedType(type);
    setUsername('');
    setCustomUrl('');
    setIsValid(false);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (selectedType && (selectedType === 'instagram' || selectedType === 'facebook')) {
      validateAndSetURL(selectedType, value);
    }
  };

  const handleCustomUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomUrl(value);
    if (selectedType === 'custom') {
      validateAndSetURL(selectedType, value);
    }
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
          Choose Platform
        </h1>
      </div>

      <div className="space-y-4 mb-8">
        {/* Instagram Option */}
        <Card 
          className={`p-4 cursor-pointer hover-elevate transition-all duration-200 bg-white/10 backdrop-blur-sm border border-white/20 ${
            selectedType === 'instagram' ? 'ring-2 ring-white/50' : ''
          }`}
          onClick={() => handleTypeSelect('instagram')}
          data-testid="option-instagram"
        >
          <div className="flex items-center space-x-3">
            <Instagram className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Instagram</span>
          </div>
        </Card>

        {selectedType === 'instagram' && (
          <div className="ml-8 space-y-2">
            <Label className="text-white/80 text-sm">Username</Label>
            <div className="flex items-center space-x-2">
              <span className="text-white/60 text-sm">instagram.com/</span>
              <Input
                type="text"
                placeholder="username"
                value={username}
                onChange={handleUsernameChange}
                className="flex-1 h-10 bg-white/10 border-white/30 text-white placeholder:text-white/60"
                data-testid="input-instagram-username"
              />
            </div>
          </div>
        )}

        {/* Facebook Option */}
        <Card 
          className={`p-4 cursor-pointer hover-elevate transition-all duration-200 bg-white/10 backdrop-blur-sm border border-white/20 ${
            selectedType === 'facebook' ? 'ring-2 ring-white/50' : ''
          }`}
          onClick={() => handleTypeSelect('facebook')}
          data-testid="option-facebook"
        >
          <div className="flex items-center space-x-3">
            <Facebook className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Facebook</span>
          </div>
        </Card>

        {selectedType === 'facebook' && (
          <div className="ml-8 space-y-2">
            <Label className="text-white/80 text-sm">Username</Label>
            <div className="flex items-center space-x-2">
              <span className="text-white/60 text-sm">facebook.com/</span>
              <Input
                type="text"
                placeholder="username"
                value={username}
                onChange={handleUsernameChange}
                className="flex-1 h-10 bg-white/10 border-white/30 text-white placeholder:text-white/60"
                data-testid="input-facebook-username"
              />
            </div>
          </div>
        )}

        {/* Custom URL Option */}
        <Card 
          className={`p-4 cursor-pointer hover-elevate transition-all duration-200 bg-white/10 backdrop-blur-sm border border-white/20 ${
            selectedType === 'custom' ? 'ring-2 ring-white/50' : ''
          }`}
          onClick={() => handleTypeSelect('custom')}
          data-testid="option-custom"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Custom URL</span>
            </div>
            <div className="flex items-center space-x-1">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-medium">PREMIUM</span>
            </div>
          </div>
        </Card>

        {selectedType === 'custom' && (
          <div className="ml-8 space-y-2">
            <Label className="text-white/80 text-sm">Website URL</Label>
            <Input
              type="url"
              placeholder="https://example.com"
              value={customUrl}
              onChange={handleCustomUrlChange}
              className="h-10 bg-white/10 border-white/30 text-white placeholder:text-white/60"
              data-testid="input-custom-url"
            />
          </div>
        )}
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