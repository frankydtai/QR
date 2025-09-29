import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QrCode, Users, Sparkles } from 'lucide-react';

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-light text-white mb-4" data-testid="app-title">
              MyQR
            </h1>
            <p className="text-white/80 text-lg">
              Create beautiful QR codes with custom designs and images
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <Card className="p-4 bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-white" />
                <span className="text-white">Multiple stunning styles</span>
              </div>
            </Card>
            
            <Card className="p-4 bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-white" />
                <span className="text-white">Social media integration</span>
              </div>
            </Card>
            
            <Card className="p-4 bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-3">
                <QrCode className="w-5 h-5 text-white" />
                <span className="text-white">Custom image uploads</span>
              </div>
            </Card>
          </div>

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            className="w-full h-12 bg-white/20 border border-white/30 text-white hover:bg-white/30 text-lg"
            data-testid="button-login"
          >
            Continue with Google & More
          </Button>
          
          <p className="text-white/60 text-sm mt-4">
            Sign in to start creating amazing QR codes
          </p>
        </div>
      </main>
    </div>
  );
}