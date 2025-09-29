import QRModelSelector from '../QRModelSelector';

export default function QRModelSelectorExample() {
  return (
    <div className="min-h-screen bg-background">
      <QRModelSelector 
        onStyleSelect={(style) => console.log('Style selected:', style)}
      />
    </div>
  );
}