interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export default function ProgressIndicator({ currentStep, totalSteps, stepLabels }: ProgressIndicatorProps) {
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex items-center justify-between mb-2">
        {stepLabels.map((label, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index + 1 <= currentStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
              data-testid={`step-indicator-${index + 1}`}
            >
              {index + 1}
            </div>
            <span className={`text-xs mt-1 ${
              index + 1 <= currentStep ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          data-testid="progress-bar"
        />
      </div>
    </div>
  );
}