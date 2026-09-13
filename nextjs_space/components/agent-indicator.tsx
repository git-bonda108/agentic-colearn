'use client';

import { motion } from 'framer-motion';
import { AgentAvatar } from './agent-avatar';
import { AGENT_CONFIGS, type AgentType } from '@/lib/agent-types';

interface AgentIndicatorProps {
  agentType: AgentType;
  agentName?: string;
}

export function AgentIndicator({ agentType, agentName }: AgentIndicatorProps) {
  const config = AGENT_CONFIGS[agentType];
  const displayName = agentName ?? config?.name ?? 'Agent';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700"
    >
      <AgentAvatar agentType={agentType} size="sm" animate />
      <div>
        <p className="text-sm font-semibold text-gray-200">{displayName}</p>
        <p className="text-xs text-gray-400">{config?.description ?? ''}</p>
      </div>
      <div className="ml-auto flex gap-1">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0 }}
          className="w-2 h-2 rounded-full bg-purple-500"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
          className="w-2 h-2 rounded-full bg-blue-500"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
          className="w-2 h-2 rounded-full bg-green-500"
        />
      </div>
    </motion.div>
  );
}