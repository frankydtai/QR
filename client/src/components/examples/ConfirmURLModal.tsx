import ConfirmURLModal from '../ConfirmURLModal';

export default function ConfirmURLModalExample() {
  return (
    <div className="min-h-screen bg-background relative">
      <ConfirmURLModal 
        isOpen={true}
        url="https://instagram.com/username"
        onConfirm={() => console.log('Confirmed')}
        onBack={() => console.log('Back clicked')}
      />
    </div>
  );
}