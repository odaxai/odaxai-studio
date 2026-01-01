'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Download,
  Check,
  Folder,
  HardDrive,
  Cpu,
  Zap,
  Code,
  MessageCircle,
  Brain,
} from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useDownloadStore } from '@/store/download-store';
import { AVAILABLE_MODELS } from '@/lib/models-config';

// --- Utility: Parse Size ---
const parseSize = (sizeStr?: string) => {
  if (!sizeStr) return 0;
  const num = parseFloat(sizeStr.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 0;
  if (sizeStr.toLowerCase().includes('mb')) return num / 1024;
  return num;
};

// --- Component: Glass Sparkline (Realtime) ---
const GlassSparkline = ({ title, value, suffix, color, icon: Icon }: any) => {
  const [history, setHistory] = useState<number[]>(Array(30).fill(0));

  useEffect(() => {
    setHistory((prev) => [...prev.slice(1), value]);
  }, [value]);

  const points = history
    .map((val, i) => {
      const x = (i / (history.length - 1)) * 100;
      const normalized = Math.min(Math.max(val / 100, 0), 1);
      const y = 100 - normalized * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md group hover:bg-white/10 transition-all duration-500">
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg bg-${color}-500/20 text-${color}-400`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
            {title}
          </span>
        </div>
        <span className="text-xl font-bold text-white tracking-tight">
          {value.toFixed(0)}
          <span className="text-sm font-normal text-white/40 ml-0.5">
            {suffix}
          </span>
        </span>
      </div>

      {/* Chart */}
      <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30 group-hover:opacity-60 transition-opacity">
        <svg
          className="w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor={
                  color === 'blue'
                    ? '#3b82f6'
                    : color === 'purple'
                      ? '#a855f7'
                      : '#ec4899'
                }
                stopOpacity="0.5"
              />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 100 L ${points} L 100 100 Z`}
            fill={`url(#grad-${title})`}
          />
          <path
            d={`M ${points}`}
            fill="none"
            stroke={
              color === 'blue'
                ? '#3b82f6'
                : color === 'purple'
                  ? '#a855f7'
                  : '#ec4899'
            }
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
};

// --- Component: Storage Ring ---
const StorageRing = ({ models }: { models: any[] }) => {
  const totalSizeGB = models.reduce((acc, m) => acc + parseSize(m.size), 0);

  return (
    <div className="relative w-48 h-48 mx-auto my-4">
      {/* Glowing Backlight */}
      <div className="absolute inset-0 bg-emerald-600/20 blur-[40px] rounded-full animate-pulse" />

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-2xl relative z-10"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#27272a"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#10b981"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${Math.min(totalSizeGB * 10, 280)} 283`}
          transform="rotate(-90 50 50)"
          className="transition-all duration-500"
        />
        <circle cx="50" cy="50" r="35" fill="#09090b" />
      </svg>

      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
        <span className="text-3xl font-black text-white tracking-tighter">
          {totalSizeGB.toFixed(1)}
        </span>
        <span className="text-[10px] font-bold text-white/50 uppercase">
          GB Used
        </span>
      </div>
    </div>
  );
};

// --- Component: Toggle Switch ---
const ToggleSwitch = ({
  isOn,
  isLoading,
  onToggle,
}: {
  isOn: boolean;
  isLoading: boolean;
  onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    disabled={isLoading}
    className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
      isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'
    } ${isOn ? 'bg-emerald-500' : 'bg-zinc-700'}`}
  >
    <div
      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center ${
        isOn ? 'left-8' : 'left-1'
      }`}
    >
      {isLoading ? (
        <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      ) : isOn ? (
        <Check className="w-3 h-3 text-emerald-500" />
      ) : (
        <Download className="w-3 h-3 text-zinc-400" />
      )}
    </div>
  </button>
);

// --- Component: Model Card ---
const ModelCard = ({
  model,
  isInstalled,
  downloading,
  downloadProgress,
  deleting,
  onToggle,
  onCancel,
}: {
  model: any;
  isInstalled: boolean;
  downloading: string | null;
  downloadProgress: {
    progress: number;
    speed: string;
    eta: string;
    downloadedMB: string;
  } | null;
  deleting: string | null;
  onToggle: () => void;
  onCancel: () => void;
}) => {
  const isDownloading = downloading === model.id;
  const isLoading =
    isDownloading ||
    (deleting !== null && model.filename && deleting.includes(model.filename));
  const isComingSoon = model.comingSoon === true;

  return (
    <div
      className={`relative p-3 rounded-xl border transition-all duration-300 ${
        isComingSoon
          ? 'bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/20'
          : isDownloading
            ? 'bg-blue-500/5 border-blue-500/20'
            : isInstalled
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isComingSoon
                ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                : isDownloading
                  ? 'bg-blue-500/20'
                  : isInstalled
                    ? 'bg-emerald-500/20'
                    : 'bg-white/5'
            }`}
          >
            {isComingSoon ? (
              <svg
                className="w-5 h-5 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            ) : isDownloading ? (
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : isInstalled ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <Download className="w-5 h-5 text-white/40" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-bold text-white truncate">
                {model.name}
              </h3>
              {model.recommended && !isComingSoon && (
                <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-amber-500/20 text-amber-400 rounded shrink-0">
                  ★
                </span>
              )}
            </div>
            {isDownloading && downloadProgress ? (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-blue-400 font-mono">
                  {downloadProgress.downloadedMB} MB
                </span>
                <span className="text-white/40">•</span>
                <span className="text-blue-300">{downloadProgress.speed}</span>
                <span className="text-white/40">•</span>
                <span className="text-white/50">
                  ETA: {downloadProgress.eta}
                </span>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-white/50 truncate">
                  {model.description}
                </p>
                <span className="text-[10px] font-mono text-white/30">
                  {model.size}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Toggle Switch - disabled for coming soon */}
        {isComingSoon ? (
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <span className="text-[10px] text-purple-300 font-bold tracking-wide">
              COMING SOON
            </span>
          </div>
        ) : (
          <ToggleSwitch
            isOn={isInstalled}
            isLoading={isLoading}
            onToggle={onToggle}
          />
        )}
      </div>

      {/* Progress Bar for downloading */}
      {isDownloading && downloadProgress && (
        <div className="mt-3">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress.progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-white/40">
            <span>{downloadProgress.progress}%</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="text-red-400 hover:text-red-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Page ---
export default function ModelsPage(): JSX.Element {
  const { fetchModels, availableModels, modelPath, setModelPath } =
    useChatStore();

  // Global download store for persistence across pages
  const {
    activeDownload,
    startDownload,
    updateProgress,
    completeDownload,
    cancelDownload,
    setPollingInterval,
  } = useDownloadStore();

  // Derived state from global store
  const downloading = activeDownload?.modelId || null;
  const downloadProgress = activeDownload?.progress || null;

  // States
  const [customPath, setCustomPath] = useState(modelPath || '~/.odax/models');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState({ cpu: 15, ram: 4, npu: 0 });
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for active downloads on mount - sync with global store
  const checkActiveDownloads = async () => {
    try {
      const res = await fetch('/api/models/download');
      const data = await res.json();

      if (data.downloads && data.downloads.length > 0) {
        const serverDownload = data.downloads.find(
          (d: any) => d.status === 'downloading'
        );
        if (serverDownload && !activeDownload) {
          // Resume polling for this download from server
          const modelId = serverDownload.filename.replace('.gguf', '');
          startDownload(
            modelId,
            serverDownload.filename,
            serverDownload.repo || ''
          );
          startPolling(serverDownload.filename);
        }
      }
    } catch (e) {
      // Ignore
    }
  };

  // Polling function - uses global store
  const startPolling = (filename: string) => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const progressRes = await fetch(
          `/api/models/download?filename=${filename}`
        );
        const data = await progressRes.json();

        if (data.status === 'complete') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          completeDownload();
          fetchModels();
        } else if (data.status === 'error') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          completeDownload();
        } else if (data.status === 'downloading') {
          updateProgress({
            progress: data.progress || 0,
            speed: data.speed || '0 MB/s',
            eta: data.eta || 'calculating',
            downloadedMB: data.downloadedMB || '0',
          });
        } else if (data.status === 'not_found') {
          // Download finished or never started
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          completeDownload();
          fetchModels();
        }
      } catch (e) {
        // Ignore poll errors
      }
    }, 1000);

    setPollingInterval(pollIntervalRef.current);
  };

  useEffect(() => {
    fetchModels();
    checkActiveDownloads();

    const interval = setInterval(() => {
      setStats((prev) => ({
        cpu: Math.max(5, Math.min(100, prev.cpu + (Math.random() - 0.5) * 20)),
        ram: Math.max(2, Math.min(32, prev.ram + (Math.random() - 0.5))),
        npu: Math.random() > 0.7 ? Math.random() * 80 : 0,
      }));
    }, 1000);

    return () => {
      clearInterval(interval);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Check if a catalog model is installed
  const isInstalled = (model: any) => {
    return availableModels.some((m: any) => {
      const pathLower = m.path?.toLowerCase() || '';
      const filenameLower = model.filename?.toLowerCase() || '';
      return pathLower.includes(filenameLower);
    });
  };

  // Handle Download with progress polling - uses global store
  const handleDownload = async (model: any) => {
    if (!model.repo_id || !model.filename) return;

    // Start download in global store
    startDownload(model.id, model.filename, model.repo_id);

    try {
      // Start download on server
      const res = await fetch('/api/models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: model.repo_id, filename: model.filename }),
      });

      if (!res.ok) {
        cancelDownload();
        return;
      }

      // Start polling
      startPolling(model.filename);
    } catch (err) {
      console.error('Download error:', err);
      cancelDownload();
    }
  };

  // Handle Delete
  const handleDelete = async (modelPath: string) => {
    setDeleting(modelPath);
    try {
      const res = await fetch('/api/models', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: modelPath }),
      });

      if (res.ok) {
        console.log('✅ Model deleted');
        fetchModels();
      }
    } catch (err) {
      console.error('❌ Delete error:', err);
    } finally {
      setDeleting(null);
    }
  };

  // Handle Cancel Download - uses global store
  const handleCancelDownload = async (model: any) => {
    try {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      await fetch('/api/models/download', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: model.filename,
          repo: model.repo_id,
        }),
      });

      cancelDownload();
      console.log('✅ Download cancelled');
    } catch (err) {
      console.error('❌ Cancel error:', err);
    }
  };

  // Handle Toggle
  const handleToggle = (model: any) => {
    const installed = isInstalled(model);
    console.log(
      'Toggle:',
      model.name,
      'installed:',
      installed,
      'filename:',
      model.filename
    );

    if (installed) {
      // Find the installed path by checking if filename is in the path
      const installedModel = availableModels.find((m: any) => {
        const pathLower = m.path?.toLowerCase() || '';
        const filenameLower = model.filename?.toLowerCase() || '';
        return pathLower.includes(filenameLower);
      });

      console.log('Found installed model:', installedModel);

      if (installedModel?.path) {
        handleDelete(installedModel.path);
      } else {
        console.error('Could not find installed model path');
      }
    } else {
      handleDownload(model);
    }
  };

  return (
    <div className="h-full w-full max-w-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-900 via-zinc-950 to-black text-white overflow-hidden flex flex-col font-sans selection:bg-purple-500/30 box-border">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden pt-4 pb-6 px-6 gap-6">
        {/* Left Panel: Storage & Stats */}
        <div className="w-[280px] flex flex-col gap-4 shrink-0 h-full">
          {/* Storage */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
              Storage
            </div>
            <StorageRing models={availableModels} />

            {/* Path Control */}
            <div className="flex items-center gap-2 bg-black/40 rounded-lg p-2 border border-white/5 mt-2">
              <Folder className="w-3.5 h-3.5 text-white/40 shrink-0" />
              <input
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setModelPath(customPath);
                    fetchModels();
                  }
                }}
                className="bg-transparent text-[10px] font-mono text-white/60 flex-1 outline-none min-w-0"
                placeholder="~/.odax/models"
              />
              <button
                onClick={async () => {
                  // Try native folder picker (only works in OdaxStudio app)
                  if ((window as any).odax?.openFolderPicker) {
                    try {
                      const path = await (
                        window as any
                      ).odax.openFolderPicker();
                      if (path) {
                        setCustomPath(path);
                        setModelPath(path);
                        fetchModels();
                      }
                    } catch (e) {
                      console.log('Folder picker cancelled');
                    }
                  } else {
                    // Fallback for browser
                    const path = prompt(
                      'Enter models folder path:',
                      customPath
                    );
                    if (path) {
                      setCustomPath(path);
                      setModelPath(path);
                      fetchModels();
                    }
                  }
                }}
                className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white/60 transition"
              >
                Browse
              </button>
              <button
                onClick={() => {
                  setModelPath(customPath);
                  fetchModels();
                }}
                className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1 rounded text-emerald-400 transition border border-emerald-500/30"
              >
                Load
              </button>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <GlassSparkline
              title="CPU"
              value={stats.cpu}
              suffix="%"
              color="blue"
              icon={Cpu}
            />
            <GlassSparkline
              title="NPU"
              value={stats.npu}
              suffix="%"
              color="purple"
              icon={Zap}
            />
          </div>

          <div className="shrink-0">
            <GlassSparkline
              title="RAM"
              value={stats.ram}
              suffix="GB"
              color="pink"
              icon={HardDrive}
            />
          </div>
        </div>

        {/* Right Panel: Model Cards */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-white mb-1">AI Models</h1>
            <p className="text-sm text-white/50">
              Toggle to install or uninstall models
            </p>
          </div>

          {/* Model Cards by Category */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            {/* ODAX AI Section - Coming Soon */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <svg
                  className="w-4 h-4 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wide">
                  OdaxAI
                </h2>
                <span className="text-xs text-purple-300/60">— Our Models</span>
              </div>
              <div className="space-y-2">
                {AVAILABLE_MODELS.filter((m) => m.category === 'odax').map(
                  (model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isInstalled={isInstalled(model)}
                      downloading={downloading}
                      downloadProgress={downloadProgress}
                      deleting={deleting}
                      onToggle={() => handleToggle(model)}
                      onCancel={() => handleCancelDownload(model)}
                    />
                  )
                )}
              </div>
            </div>

            {/* CODING Section */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Code className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white/80 uppercase tracking-wide">
                  Coding
                </h2>
                <span className="text-xs text-white/40">— For VSCode</span>
              </div>
              <div className="space-y-2">
                {AVAILABLE_MODELS.filter((m) => m.category === 'coding').map(
                  (model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isInstalled={isInstalled(model)}
                      downloading={downloading}
                      downloadProgress={downloadProgress}
                      deleting={deleting}
                      onToggle={() => handleToggle(model)}
                      onCancel={() => handleCancelDownload(model)}
                    />
                  )
                )}
              </div>
            </div>

            {/* CHAT Section */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <MessageCircle className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white/80 uppercase tracking-wide">
                  Chat
                </h2>
                <span className="text-xs text-white/40">— For OdaxChat</span>
              </div>
              <div className="space-y-2">
                {AVAILABLE_MODELS.filter((m) => m.category === 'chat').map(
                  (model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isInstalled={isInstalled(model)}
                      downloading={downloading}
                      downloadProgress={downloadProgress}
                      deleting={deleting}
                      onToggle={() => handleToggle(model)}
                      onCancel={() => handleCancelDownload(model)}
                    />
                  )
                )}
              </div>
            </div>

            {/* THINKING Section - For Deep Research */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Brain className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white/80 uppercase tracking-wide">
                  Thinking
                </h2>
                <span className="text-xs text-white/40">
                  — For Deep Research
                </span>
              </div>
              <div className="space-y-2">
                {AVAILABLE_MODELS.filter((m) => m.category === 'thinking').map(
                  (model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isInstalled={isInstalled(model)}
                      downloading={downloading}
                      downloadProgress={downloadProgress}
                      deleting={deleting}
                      onToggle={() => handleToggle(model)}
                      onCancel={() => handleCancelDownload(model)}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
