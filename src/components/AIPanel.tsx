/**
 * AI Chat Panel Component (MVP)
 *
 * Simplified chat interface for interacting with Claude AI.
 * Features: message input/display, session management, markdown support.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';
import { useAuth } from '../contexts/AuthContext';
import { useAI } from '../hooks/useAI';
import { aiStorage } from '../utils/aiStorage';
import type { AIChatSession, AIChatMessage, AIProvider } from '../types/ai';
import { focusRing } from '../lib/focusRing';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({ isOpen, onClose, onOpenSettings }) => {
  const { user } = useAuth();
  const accountId = user?.userId || 'anonymous';
  const provider: AIProvider = 'claude'; // MVP: Only Claude

  const { config, isLoading: isAILoading, sendMessage } = useAI(provider, accountId);

  // State
  const [currentSession, setCurrentSession] = useState<AIChatSession | null>(null);
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions on mount
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, accountId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const loadSessions = async () => {
    try {
      const loadedSessions = await aiStorage.getSessions(accountId, 10);
      setSessions(loadedSessions);

      // Auto-select the most recent session
      if (loadedSessions.length > 0 && !currentSession) {
        setCurrentSession(loadedSessions[0]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const createNewSession = () => {
    const newSession: AIChatSession = {
      id: nanoid(),
      title: '新しいチャット',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provider,
    };

    setCurrentSession(newSession);
    setSessions([newSession, ...sessions]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending || !currentSession) return;

    // Check if AI is configured
    if (!config || !config.enabled) {
      alert('AIが設定されていません。設定画面でAPIキーを設定してください。');
      return;
    }

    setIsSending(true);
    const userMessageContent = inputMessage.trim();
    setInputMessage('');

    try {
      // Add user message
      const userMessage: AIChatMessage = {
        id: nanoid(),
        role: 'user',
        content: userMessageContent,
        timestamp: new Date().toISOString(),
        provider,
      };

      const updatedSession = {
        ...currentSession,
        messages: [...currentSession.messages, userMessage],
        updatedAt: new Date().toISOString(),
      };

      setCurrentSession(updatedSession);

      // Get AI response
      const reply = await sendMessage(userMessageContent);

      // Add assistant message
      const assistantMessage: AIChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
        provider,
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
        updatedAt: new Date().toISOString(),
        title: updatedSession.messages.length === 0 ? userMessageContent.slice(0, 50) : updatedSession.title,
      };

      setCurrentSession(finalSession);

      // Save session
      await aiStorage.saveSession(accountId, finalSession);
      await loadSessions();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(error instanceof Error ? error.message : 'メッセージの送信に失敗しました');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await aiStorage.deleteSession(accountId, sessionId);
      await loadSessions();

      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-[80vh] rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f0f0f] to-[#191919] shadow-2xl overflow-hidden flex"
        style={{
          backdropFilter: 'blur(24px)',
          boxShadow: '0 35px 80px rgba(0,0,0,0.45), inset 0 1px 0 var(--metallic-edge-top)',
        }}
      >
        {/* Sidebar - Session List */}
        <div className="w-64 border-r border-white/10 bg-surface-subtle/50 flex flex-col">
          <div className="p-inset-lg border-b border-white/10">
            <h2 className="text-title-2 font-semibold text-[var(--text-primary)] mb-stack-sm">AI アシスタント</h2>
            <button
              onClick={createNewSession}
              className={`w-full rounded-xl px-inset-md py-inset-sm text-body-sm font-medium
                bg-brand-purple/20 border border-brand-purple/40 text-brand-purple
                hover:bg-brand-purple/30 transition-all duration-200 ${focusRing.default} ${focusRing.brand}`}
            >
              + 新しいチャット
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-inset-sm space-y-stack-xs">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg p-inset-sm cursor-pointer transition-all
                  ${
                    currentSession?.id === session.id
                      ? 'bg-brand-purple/20 border border-brand-purple/40'
                      : 'hover:bg-surface-primary/50 border border-transparent'
                  }`}
                onClick={() => setCurrentSession(session)}
              >
                <p className="text-body-sm text-[var(--text-primary)] truncate pr-6">{session.title}</p>
                <p className="text-caption text-[var(--text-muted)] mt-1">
                  {new Date(session.updatedAt).toLocaleDateString('ja-JP')}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity
                    text-[var(--text-muted)] hover:text-red-400 p-1 rounded-lg"
                  aria-label="セッションを削除"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="p-inset-md border-t border-white/10">
            <button
              onClick={onOpenSettings}
              className={`w-full rounded-xl px-inset-md py-inset-sm text-body-sm
                text-[var(--text-secondary)] hover:bg-surface-primary/50 transition-all
                ${focusRing.default} ${focusRing.brand} flex items-center gap-inline-sm`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              設定
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-inset-lg border-b border-white/10">
            <div className="flex items-center gap-inline-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-body font-medium text-[var(--text-primary)]">Claude</span>
            </div>
            <button
              onClick={onClose}
              className={`rounded-full p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]
                transition-colors ${focusRing.default} ${focusRing.brand}`}
              aria-label="閉じる"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-inset-lg space-y-stack-md">
            {!currentSession && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-title-3 text-[var(--text-secondary)] mb-stack-sm">
                    新しいチャットを開始してください
                  </p>
                  <button
                    onClick={createNewSession}
                    className={`rounded-xl px-inset-lg py-inset-md text-body font-medium
                      bg-brand-purple border border-brand-purple/40 text-white
                      hover:bg-brand-purple/90 transition-all ${focusRing.default} ${focusRing.brand}`}
                  >
                    チャットを開始
                  </button>
                </div>
              </div>
            )}

            {currentSession?.messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-inset-md py-inset-sm ${
                    message.role === 'user'
                      ? 'bg-brand-purple/20 border border-brand-purple/40'
                      : 'bg-surface-subtle/50 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-inline-sm mb-1">
                    <span className="text-caption font-medium text-[var(--text-secondary)]">
                      {message.role === 'user' ? 'あなた' : 'Claude'}
                    </span>
                    <span className="text-caption text-[var(--text-muted)]">{formatTime(message.timestamp)}</span>
                  </div>
                  <p className="text-body text-[var(--text-primary)] whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}

            {isSending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-surface-subtle/50 border border-white/10 rounded-2xl px-inset-md py-inset-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 p-inset-lg">
            <div className="flex gap-inline-sm">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力... (Enter で送信、Shift+Enter で改行)"
                disabled={!currentSession || isSending}
                rows={3}
                className={`flex-1 rounded-xl border border-white/10 bg-surface-primary/50 px-inset-md py-inset-sm
                  text-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                  resize-none transition-colors hover:border-white/20 focus:border-brand-purple
                  focus:outline-none ${focusRing.default} ${focusRing.brand}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSending || !currentSession}
                className={`self-end rounded-xl px-inset-lg py-inset-sm text-body font-medium
                  bg-brand-purple border border-brand-purple/40 text-white
                  hover:bg-brand-purple/90 transition-all ${focusRing.default} ${focusRing.brand}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                送信
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
