// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import {
  X,
  FileText,
  Download,
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle, // WhatsApp-like icon
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';

interface ShareModalProps {
  onClose: () => void;
  query: string;
  answer: string;
}

export default function ShareModal({
  onClose,
  query,
  answer,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const textToShare = `Check out this research on "${query}" powered by OdaxAI:\n\n${answer.substring(0, 100)}...\n\n`;

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const socialLinks = [
    {
      name: 'Twitter/X',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(textToShare)}`,
      color: 'hover:bg-black hover:text-white',
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodeURIComponent(textToShare + shareUrl)}`,
      color: 'hover:bg-green-500 hover:text-white',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: 'hover:bg-blue-600 hover:text-white',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: 'hover:bg-blue-700 hover:text-white',
    },
    {
      name: 'Email',
      icon: Mail,
      url: `mailto:?subject=${encodeURIComponent(`OdaxAI Research: ${query}`)}&body=${encodeURIComponent(textToShare)}`,
      color: 'hover:bg-gray-600 hover:text-white',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-400">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-xl text-white">Share Research</h3>
          <p className="text-white/40 text-sm mt-1">"{query}"</p>
        </div>

        {/* Social Grid */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all group ${social.color}`}
              title={`Share on ${social.name}`}
            >
              <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <social.icon className="w-5 h-5 text-white/80 group-hover:text-white" />
              </div>
            </a>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? 'Copied to Clipboard' : 'Copy Text'}
          </button>

          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Download className="w-4 h-4" /> Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
