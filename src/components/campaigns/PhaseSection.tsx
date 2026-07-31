import React from 'react';
import {
  CampaignItem,
  CampaignItemStatus,
  CampaignPhase,
} from '@/types/campaigns';
import ItemRow from './ItemRow';

const formatPhaseDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

interface PhaseSectionProps {
  phase: CampaignPhase;
  index: number;
  generatingPostIds: number[];
  onItemStatusChange: (item: CampaignItem, status: CampaignItemStatus) => void;
  onGeneratePost: (item: CampaignItem) => void;
  onCopyContent: (text: string) => void;
}

const PhaseSection: React.FC<PhaseSectionProps> = ({
  phase,
  index,
  generatingPostIds,
  onItemStatusChange,
  onGeneratePost,
  onCopyContent,
}) => {
  const sortedItems = [...phase.items].sort((a, b) => {
    if (a.scheduled_date && b.scheduled_date && a.scheduled_date !== b.scheduled_date) {
      return a.scheduled_date < b.scheduled_date ? -1 : 1;
    }
    if (a.scheduled_date && !b.scheduled_date) return -1;
    if (!a.scheduled_date && b.scheduled_date) return 1;
    return a.sort_order - b.sort_order;
  });

  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-gray-800">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold mr-2 align-middle">
            {index + 1}
          </span>
          {phase.name}
        </h3>
        {(phase.start_date || phase.end_date) && (
          <span className="text-[11px] text-gray-400 whitespace-nowrap">
            {formatPhaseDate(phase.start_date)} – {formatPhaseDate(phase.end_date)}
          </span>
        )}
      </div>
      {phase.goal && <p className="text-xs text-gray-500 mb-2 ml-7">🎯 {phase.goal}</p>}
      {phase.description && !phase.goal && (
        <p className="text-xs text-gray-500 mb-2 ml-7">{phase.description}</p>
      )}

      {sortedItems.length === 0 ? (
        <p className="text-xs text-gray-400 ml-7">Sin elementos en esta fase.</p>
      ) : (
        <div className="space-y-1.5">
          {sortedItems.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              generatingPost={generatingPostIds.includes(item.id)}
              onStatusChange={onItemStatusChange}
              onGeneratePost={onGeneratePost}
              onCopyContent={onCopyContent}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default PhaseSection;
