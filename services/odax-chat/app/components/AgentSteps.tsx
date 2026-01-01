'use client';

import { Loader2, Search, FileText, CheckCircle, Brain } from 'lucide-react';

interface AgentStep {
  type: 'thinking' | 'searching' | 'reading' | 'answering';
  message: string;
  step: number;
}

interface AgentStepsProps {
  steps: AgentStep[];
  currentStep: number;
  progress: number;
}

export default function AgentSteps({
  steps,
  currentStep,
  progress,
}: AgentStepsProps) {
  const getIcon = (type: AgentStep['type'], isActive: boolean) => {
    const size = 14;
    const color = isActive ? '#6366f1' : '#404040';

    switch (type) {
      case 'thinking':
        return <Brain size={size} color={color} />;
      case 'searching':
        return <Search size={size} color={color} />;
      case 'reading':
        return <FileText size={size} color={color} />;
      case 'answering':
        return <CheckCircle size={size} color={color} />;
    }
  };

  return (
    <div
      style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #2a2a2a',
        marginBottom: '12px',
      }}
    >
      {/* Header with progress */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2
            size={16}
            color="#6366f1"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <span style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 600 }}>
            Deep Research
          </span>
        </div>
        <span
          style={{
            color: '#6366f1',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'monospace',
          }}
        >
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '3px',
          background: '#2a2a2a',
          borderRadius: '2px',
          marginBottom: '16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: '#6366f1',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isComplete = idx < currentStep;

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                background: isActive
                  ? 'rgba(99, 102, 241, 0.1)'
                  : 'transparent',
                borderRadius: '6px',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  background: isActive
                    ? '#6366f1'
                    : isComplete
                      ? '#10b981'
                      : '#2a2a2a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isActive ? (
                  <Loader2
                    size={12}
                    color="white"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                ) : isComplete ? (
                  <CheckCircle size={12} color="white" />
                ) : (
                  getIcon(step.type, false)
                )}
              </div>

              <span
                style={{
                  color: isActive
                    ? '#e0e0e0'
                    : isComplete
                      ? '#808080'
                      : '#505050',
                  fontSize: '12px',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {step.message}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
