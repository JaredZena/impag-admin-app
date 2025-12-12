// =============================================================================
// Channel Configuration (Frontend Display Only)
// The detailed AI context is in the backend: impag-quot/routes/social.py
// =============================================================================

import type { Channel } from '../../types/socialCalendar';

// Simple display config for the frontend UI
export interface ChannelDisplayConfig {
  channel: Channel;
  label: string;
  icon: string; // Emoji for display
  color: string; // CSS color for badges
}

export const CHANNEL_DISPLAY: Record<Channel, ChannelDisplayConfig> = {
  'wa-status': {
    channel: 'wa-status',
    label: 'WA Status',
    icon: '📱',
    color: '#25D366'
  },
  'wa-broadcast': {
    channel: 'wa-broadcast',
    label: 'WA Difusión',
    icon: '📨',
    color: '#25D366'
  },
  'wa-message': {
    channel: 'wa-message',
    label: 'WA Mensaje',
    icon: '💬',
    color: '#25D366'
  },
  'fb-post': {
    channel: 'fb-post',
    label: 'FB + IG Post',
    icon: '📸',
    color: '#1877F2'
  },
  'fb-reel': {
    channel: 'fb-reel',
    label: 'FB + IG Reel',
    icon: '🎬',
    color: '#E4405F'
  },
  'ig-post': {
    channel: 'ig-post',
    label: 'IG Post',
    icon: '📷',
    color: '#E4405F'
  },
  'ig-reel': {
    channel: 'ig-reel',
    label: 'IG Reel',
    icon: '🎥',
    color: '#E4405F'
  },
  'tiktok': {
    channel: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    color: '#000000'
  }
};

/**
 * Get display config for a channel
 */
export function getChannelConfig(channel: Channel): ChannelDisplayConfig {
  return CHANNEL_DISPLAY[channel];
}

/**
 * Get label for a channel
 */
export function getChannelLabel(channel: Channel): string {
  return CHANNEL_DISPLAY[channel]?.label || channel;
}

/**
 * Get icon for a channel
 */
export function getChannelIcon(channel: Channel): string {
  return CHANNEL_DISPLAY[channel]?.icon || '📱';
}
