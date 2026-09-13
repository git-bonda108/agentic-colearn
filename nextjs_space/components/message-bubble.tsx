'use client';

import { motion } from 'framer-motion';
import { AgentAvatar } from './agent-avatar';
import { type AgentType } from '@/lib/agent-types';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant';
  agentType?: AgentType;
  index?: number;
}

export function MessageBubble({ content, role, agentType, index = 0 }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}
    >
      {!isUser && agentType && (
        <div className="flex-shrink-0">
          <AgentAvatar agentType={agentType} size="sm" />
        </div>
      )}
      
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
          isUser
            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
            : 'bg-gray-800 text-gray-100'
        }`}
      >
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{content ?? ''}</ReactMarkdown>
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shadow-lg">
            <span className="text-lg">👤</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}