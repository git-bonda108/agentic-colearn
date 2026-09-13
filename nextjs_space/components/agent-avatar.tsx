'use client';

import { AGENT_CONFIGS, type AgentType } from '@/lib/agent-types';
import { motion } from 'framer-motion';

interface AgentAvatarProps {
  agentType: AgentType;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export function AgentAvatar({ agentType, size = 'md', animate = false }: AgentAvatarProps) {
  const config = AGENT_CONFIGS[agentType];
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  };

  const avatar = (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${config?.color ?? 'from-gray-400 to-gray-600'} flex items-center justify-center shadow-lg`}
    >
      <span>{config?.icon ?? '🤖'}</span>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {avatar}
      </motion.div>
    );
  }

  return avatar;
}