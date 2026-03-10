import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import StepTracker from '../components/StepTracker';
import StepOne from '../components/StepOne';
import StepTwo from '../components/StepTwo';
import StepThree from '../components/StepThree';
import StepFour from '../components/StepFour';

type Step = 1 | 2 | 3 | 4;

const STEP_META: Record<Step, { title: string; desc: string }> = {
  1: { title: '系统检验', desc: '确认你的系统满足运行 OpenClaw 的最低环境要求' },
  2: { title: '依赖检查', desc: '检查必要的运行时工具（Node.js、Git、pnpm）' },
  3: { title: '安装方式', desc: '选择最适合你的安装方式与目录' },
  4: { title: '配置集成', desc: '选择要接入的消息渠道，完成初始配置' },
};

const STEP_LABELS: Record<Step, string> = { 1: '第一步', 2: '第二步', 3: '第三步', 4: '第四步' };

// Steps 3 and 4 handle their own CTA (no left-panel "下一步")
const LEFT_PANEL_NEXT: Step[] = [1, 2];

interface InstallerViewProps {
  initialStep?: Step;
  onComplete?: () => void;
}

const InstallerView: React.FC<InstallerViewProps> = ({ initialStep = 1, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>(initialStep);
  const [canProceed, setCanProceed]   = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [installData, setInstallData] = useState<any>({
    systemInfo:    null,
    dependencies:  null,
    installMethod: 'prebuilt' as 'prebuilt' | 'source',
    installDir:    'C:\\',
    channels:      [] as string[],
  });

  // Reset per-step readiness when step changes
  useEffect(() => {
    setCanProceed(false);
    setPendingData(null);
  }, [currentStep]);

  const handleReadyChange = (ready: boolean, data?: any) => {
    setCanProceed(ready);
    if (data !== undefined) setPendingData(data);
  };

  // Called by left-panel "下一步" (steps 1 & 2)
  const handleLeftNext = () => {
    if (!canProceed) return;
    const merged = { ...installData, ...(pendingData || {}) };
    setInstallData(merged);
    if (currentStep < 4) setCurrentStep((s) => (s + 1) as Step);
  };

  // Called by step components directly (steps 3 & 4)
  const handleStepNext = (data: any) => {
    const merged = { ...installData, ...data };
    setInstallData(merged);
    if (currentStep < 4) setCurrentStep((s) => (s + 1) as Step);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as Step);
  };

  const meta = STEP_META[currentStep];
  const showLeftNext = LEFT_PANEL_NEXT.includes(currentStep);

  return (
    <div className="app">
      <TopBar />

      <StepTracker currentStep={currentStep} />

      <div className="installer-body">
        {/* Zone 3 — Left Panel */}
        <div className="installer-left">
          <div className="installer-step-num">{STEP_LABELS[currentStep]}</div>
          <div className="installer-step-title">{meta.title}</div>
          <div className="installer-step-desc">{meta.desc}</div>

          <div className="installer-left-spacer" />

          <div className="installer-nav">
            <button
              className="btn btn-secondary btn-block"
              onClick={handlePrev}
              disabled={currentStep === 1}
            >
              ← 上一步
            </button>

            {showLeftNext && (
              <button
                className="btn btn-primary btn-block"
                onClick={handleLeftNext}
                disabled={!canProceed}
              >
                下一步 →
              </button>
            )}
          </div>
        </div>

        {/* Zone 4 — Right Panel */}
        <div className="installer-right">
          {currentStep === 1 && (
            <StepOne onReadyChange={handleReadyChange} />
          )}
          {currentStep === 2 && (
            <StepTwo onReadyChange={handleReadyChange} />
          )}
          {currentStep === 3 && (
            <StepThree onNext={handleStepNext} />
          )}
          {currentStep === 4 && (
            <StepFour onNext={handleStepNext} installData={installData} onComplete={onComplete} />
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallerView;
