import ImageUploader from '../ImageUploader';

export default function ImageUploaderExample() {
  return (
    <div className="min-h-screen bg-background">
      <ImageUploader 
        onImageSelect={(file) => console.log('Image selected:', file?.name)}
        onContinue={() => console.log('Continue clicked')}
        onBack={() => console.log('Back clicked')}
      />
    </div>
  );
}