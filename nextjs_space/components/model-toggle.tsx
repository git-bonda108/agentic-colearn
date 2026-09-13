'use client';

import { MODEL_TYPES, type ModelType } from '@/lib/agent-types';
import { motion } from 'framer-motion';

interface ModelToggleProps {
  currentModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export function ModelToggle({ currentModel, onModelChange }: ModelToggleProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg">
      <button
        onClick={() => onModelChange(MODEL_TYPES.OPENAI)}
        className="relative px-3 py-1.5 text-sm font-medium transition-colors rounded-md"
      >
        {currentModel === MODEL_TYPES.OPENAI && (
          <motion.div
            layoutId="model-indicator"
            className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <span className={`relative z-10 ${
          currentModel === MODEL_TYPES.OPENAI ? 'text-white' : 'text-gray-400'
        }`}>
          GPT-4
        </span>
      </button>
      
      <button
        onClick={() => onModelChange(MODEL_TYPES.ANTHROPIC)}
        className="relative px-3 py-1.5 text-sm font-medium transition-colors rounded-md"
      >
        {currentModel === MODEL_TYPES.ANTHROPIC && (
          <motion.div
            layoutId="model-indicator"
            className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <span className={`relative z-10 ${
          currentModel === MODEL_TYPES.ANTHROPIC ? 'text-white' : 'text-gray-400'
        }`}>
          Claude
        </span>
      </button>
    </div>
  );
}