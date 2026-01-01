'use client';

import { useState, useEffect } from 'react';
import { Power, ExternalLink, Activity, CheckCircle, XCircle, AlertCircle, Monitor, MessageSquare, Search, Cpu } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  port: number;
  url: string;
  description: string;
}

const serviceIcons = {
  'llama-server': Cpu,
  'code-server': Monitor,
  'NextChat': MessageSquare,
  'Perplexica': Search
};

const serviceColors = {
  'llama-server': 'from-blue-500 to-blue-600',
  'code-server': 'from-green-500 to-green-600',
  'NextChat': 'from-purple-500 to-purple-600',
  'Perplexica': 'from-orange-500 to-orange-600'
};

export default function ServicesPage(): JSX.Element {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      const data = await response.json();
      setServices(data.services);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  };

  const controlService = async (serviceName: string, action: 'start' | 'stop') => {
    setActionLoading(serviceName);
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, service: serviceName })
      });

      if (response.ok) {
        // Wait a bit then refresh status
        setTimeout(fetchServices, 2000);
      }
    } catch (error) {
      console.error(`Failed to ${action} ${serviceName}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchServices();
    // Refresh every 10 seconds
    const interval = setInterval(fetchServices, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-light-primary dark:bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-light-200 dark:text-dark-200" />
          <p className="text-light-200 dark:text-dark-200">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-light-primary dark:bg-dark-primary text-light-200 dark:text-dark-200 overflow-hidden flex flex-col font-sans">
      {/* Top Bar Spacer */}
      <div className="h-11 shrink-0" />

      {/* Header */}
      <div className="px-6 py-4 border-b border-light-200 dark:border-dark-200">
        <h1 className="text-2xl font-bold">Services Dashboard</h1>
        <p className="text-sm text-light-300 dark:text-dark-300 mt-1">
          Control and monitor all OdaxAI services
        </p>
      </div>

      {/* Services Grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => {
            const Icon = serviceIcons[service.name as keyof typeof serviceIcons] || Activity;
            const colorClass = serviceColors[service.name as keyof typeof serviceColors] || 'from-gray-500 to-gray-600';

            return (
              <div
                key={service.name}
                className="bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${colorClass} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    {service.status === 'running' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {service.status === 'stopped' && <XCircle className="w-4 h-4 text-red-500" />}
                    {service.status === 'error' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                  </div>
                </div>

                {/* Service Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-1">{service.name}</h3>
                  <p className="text-sm text-light-300 dark:text-dark-300 mb-2">{service.description}</p>
                  <div className="flex items-center gap-2 text-xs text-light-300 dark:text-dark-300">
                    <span>Port: {service.port}</span>
                    <span>•</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.status === 'running'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : service.status === 'error'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {service.status}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => controlService(service.name, service.status === 'running' ? 'stop' : 'start')}
                    disabled={actionLoading === service.name}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      service.status === 'running'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
                    } disabled:opacity-50`}
                  >
                    {actionLoading === service.name ? (
                      <Activity className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                    {service.status === 'running' ? 'Stop' : 'Start'}
                  </button>

                  {service.status === 'running' && (
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-light-100 dark:bg-dark-100 hover:bg-light-200 dark:hover:bg-dark-200 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* System Overview */}
        <div className="mt-8 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">System Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {services.filter(s => s.status === 'running').length}
              </div>
              <div className="text-sm text-light-300 dark:text-dark-300">Running</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {services.filter(s => s.status === 'stopped').length}
              </div>
              <div className="text-sm text-light-300 dark:text-dark-300">Stopped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {services.filter(s => s.status === 'error').length}
              </div>
              <div className="text-sm text-light-300 dark:text-dark-300">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {services.length}
              </div>
              <div className="text-sm text-light-300 dark:text-dark-300">Total</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
