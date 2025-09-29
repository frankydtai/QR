import URLInput from '../URLInput';

export default function URLInputExample() {
  return (
    <div className="min-h-screen bg-background">
      <URLInput 
        onURLChange={(url) => console.log('URL changed:', url)}
        onContinue={() => console.log('Generate QR clicked')}
        onBack={() => console.log('Back clicked')}
      />
    </div>
  );
}