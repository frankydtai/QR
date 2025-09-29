import QRGenerator from '../QRGenerator';

export default function QRGeneratorExample() {
  const mockStyle = {
    id: 'classic',
    name: 'Classic',
    preview: '/api/placeholder/80/80',
    description: 'Traditional black and white squares'
  };

  return (
    <div className="min-h-screen bg-background">
      <QRGenerator 
        url="https://example.com"
        style={mockStyle}
        image={null}
        onBack={() => console.log('Back clicked')}
      />
    </div>
  );
}