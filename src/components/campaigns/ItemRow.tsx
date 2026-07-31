import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  Newspaper,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  CampaignItem,
  CampaignItemKind,
  CampaignItemStatus,
  CAMPAIGN_CHANNEL_META,
  CAMPAIGN_ITEM_STATUS_META,
} from '@/types/campaigns';

const KIND_ICONS: Record<CampaignItemKind, React.ReactNode> = {
  post: <Newspaper size={15} className="text-blue-600" />,
  whatsapp: <MessageCircle size={15} className="text-green-600" />,
  task: <CheckSquare size={15} className="text-gray-500" />,
  research: <Search size={15} className="text-amber-600" />,
};

const formatItemDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
};

interface ItemRowProps {
  item: CampaignItem;
  generatingPost: boolean;
  onStatusChange: (item: CampaignItem, status: CampaignItemStatus) => void;
  onGeneratePost: (item: CampaignItem) => void;
  onCopyContent: (text: string) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({
  item,
  generatingPost,
  onStatusChange,
  onGeneratePost,
  onCopyContent,
}) => {
  const [expanded, setExpanded] = useState(false);
  const channelMeta = item.channel ? CAMPAIGN_CHANNEL_META[item.channel] : null;
  const hasDetails = Boolean(item.description || item.content);

  return (
    <div className="border border-gray-100 rounded-lg bg-white">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <button
          onClick={() => hasDetails && setExpanded(v => !v)}
          className={`shrink-0 text-gray-400 ${hasDetails ? 'hover:text-gray-600 cursor-pointer' : 'opacity-30 cursor-default'}`}
          aria-label={expanded ? 'Contraer' : 'Expandir'}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        <span className="shrink-0">{KIND_ICONS[item.kind]}</span>

        {item.scheduled_date && (
          <span className="shrink-0 text-[11px] text-gray-500 whitespace-nowrap w-20">
            {formatItemDate(item.scheduled_date)}
          </span>
        )}

        {channelMeta && (
          <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap ${channelMeta.cls}`}>
            {channelMeta.label}
          </span>
        )}

        <span
          className={`flex-1 min-w-0 text-sm truncate ${item.status === 'done' ? 'text-gray-400 line-through' : item.status === 'skipped' ? 'text-gray-400' : 'text-gray-800'}`}
          title={item.title}
        >
          {item.title}
        </span>

        {item.kind === 'post' && (
          item.social_post_id != null ? (
            <Link
              to="/social-calendar"
              className="shrink-0 flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              <ExternalLink size={13} /> Ver en calendario
            </Link>
          ) : (
            <button
              onClick={() => onGeneratePost(item)}
              disabled={generatingPost}
              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {generatingPost ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              Generar post
            </button>
          )
        )}

        <select
          value={item.status}
          onChange={e => onStatusChange(item, e.target.value as CampaignItemStatus)}
          className={`shrink-0 text-xs font-medium border rounded-md px-2 py-1 cursor-pointer ${CAMPAIGN_ITEM_STATUS_META[item.status]?.cls || ''}`}
        >
          {Object.entries(CAMPAIGN_ITEM_STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </select>
      </div>

      {expanded && hasDetails && (
        <div className="px-10 pb-3 space-y-2">
          {item.description && (
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{item.description}</p>
          )}
          {item.content && (
            <div className="border border-green-200 bg-green-50/50 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-gray-700 whitespace-pre-wrap flex-1">{item.content}</p>
                <button
                  onClick={() => onCopyContent(item.content || '')}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-white text-gray-600 text-[11px] font-medium hover:bg-gray-50 transition-colors"
                >
                  <Copy size={12} /> Copiar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemRow;
