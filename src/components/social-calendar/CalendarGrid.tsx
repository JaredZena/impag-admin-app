import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SuggestionStatus } from '../../types/socialCalendar';
import { parseDate, formatDate } from '../../lib/socialCalendarHelpers';

interface CalendarGridProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  statusMap: Record<string, SuggestionStatus>;
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth, onMonthChange, selectedDate, onSelectDate, statusMap
}) => {
  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date: Date) => {
    let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    onMonthChange(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    onMonthChange(d);
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const totalSlots = Math.ceil((daysInMonth + firstDay) / 7) * 7;
  const todayStr = formatDate(new Date());

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < totalSlots; i++) {
      if (i < firstDay || i >= firstDay + daysInMonth) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
      } else {
        const dayNum = i - firstDay + 1;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
        const dateStr = formatDate(date);
        const status = statusMap[dateStr];
        const isSelected = selectedDate === dateStr;
        const isToday = dateStr === todayStr;

        days.push(
          <div
            key={dateStr}
            className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
            onClick={() => onSelectDate(dateStr)}
          >
            <span>{dayNum}</span>
            {status && <div className={`status-dot ${status}`} />}
          </div>
        );
      }
    }
    return days;
  };

  const monthLabel = currentMonth.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
  const capitalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="calendar-panel">
      <div className="calendar-header">
        <button
          onClick={handlePrevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer border-0 bg-transparent"
        >
          <ChevronLeft size={16} />
        </button>
        <h2>{capitalizedLabel}</h2>
        <button
          onClick={handleNextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer border-0 bg-transparent"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        {renderDays()}
      </div>
    </div>
  );
};

export default CalendarGrid;
