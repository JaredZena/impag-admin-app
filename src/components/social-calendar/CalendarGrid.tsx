import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SuggestionStatus } from '../../types/socialCalendar';
import { parseDate, formatDate } from '../../lib/socialCalendarHelpers';

interface CalendarGridProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  statusMap: Record<string, SuggestionStatus>; // date -> status summary
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
    const days = new Date(year, month + 1, 0).getDate();
    return days;
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    // getDay() returns 0 for Sunday, we want 0 for Monday
    let day = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
    day = day === 0 ? 6 : day - 1; // 0(Mon) - 6(Sun)
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
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
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
        <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
          <ChevronLeft />
        </button>
        <h2>{capitalizedLabel}</h2>
        <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
          <ChevronRight />
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
