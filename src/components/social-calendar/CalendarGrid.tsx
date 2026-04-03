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
  currentMonth,
  onMonthChange,
  selectedDate,
  onSelectDate,
  statusMap
}) => {
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    let day = new Date(year, month, 1).getDay();
    day = day === 0 ? 6 : day - 1;
    return day;
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
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
          className="w-8 h-8 flex items-center justify-center rounded-lg text-green-700 hover:text-green-400 hover:bg-green-900/30 transition-all duration-150 cursor-pointer border-0 bg-transparent"
        >
          <ChevronLeft size={18} />
        </button>
        <h2>{capitalizedLabel}</h2>
        <button
          onClick={handleNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-green-700 hover:text-green-400 hover:bg-green-900/30 transition-all duration-150 cursor-pointer border-0 bg-transparent"
        >
          <ChevronRight size={18} />
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
