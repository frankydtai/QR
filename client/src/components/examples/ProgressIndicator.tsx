import ProgressIndicator from '../ProgressIndicator';

export default function ProgressIndicatorExample() {
  return (
    <div className="p-6 bg-background">
      <ProgressIndicator 
        currentStep={2} 
        totalSteps={4} 
        stepLabels={['Style', 'Image', 'URL', 'Generate']} 
      />
    </div>
  );
}