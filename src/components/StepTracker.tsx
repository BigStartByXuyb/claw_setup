import React from 'react';

const STEPS = [
  { id: 1, label: '系统检验' },
  { id: 2, label: '依赖检查' },
  { id: 3, label: '选择安装' },
  { id: 4, label: '配置集成' },
];

interface StepTrackerProps {
  currentStep: number;
}

const StepTracker: React.FC<StepTrackerProps> = ({ currentStep }) => {
  // Fill width: between node centers
  // 4 nodes: positions at 0%, 33.3%, 66.6%, 100% of the track
  // Track goes from first to last node
  const fillPercent = currentStep === 1 ? 0 :
    currentStep === 2 ? 33.3 :
    currentStep === 3 ? 66.6 : 100;

  return (
    <div className="step-tracker">
      <div className="step-tracker-inner">
        <div className="step-track-line" />
        <div
          className="step-track-fill"
          style={{ width: `calc(${fillPercent}% * (100% - 40px) / 100 + ${fillPercent > 0 ? 20 : 0}px)` }}
        />
        <div className="step-nodes">
          {STEPS.map((step) => {
            const isActive    = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div
                key={step.id}
                className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="step-node-circle">
                  {isCompleted ? '✓' : step.id}
                </div>
                <div className="step-node-label">{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StepTracker;
