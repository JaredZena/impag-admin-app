import { describe, expect, test } from 'vitest';
import type { Quote } from '@/types/quotes';
import {
  dueLabel,
  endOfWeek,
  groupNextSteps,
  normalizeOwner,
  ownerForUser,
  parseYmd,
  quickDueOptions,
  sameOwner,
  toYmd,
} from '../nextAction';

// Lunes 5 de octubre de 2026, media mañana (hora local).
const MONDAY = new Date(2026, 9, 5, 10, 30);

describe('dueLabel', () => {
  test('past due: «atrasado N días», singular for one day', () => {
    expect(dueLabel('2026-10-03', MONDAY)).toMatchObject({ text: 'atrasado 2 días', tone: 'overdue', date: 'sáb 3 oct' });
    expect(dueLabel('2026-10-04', MONDAY)).toMatchObject({ text: 'atrasado 1 día', tone: 'overdue' });
  });

  test('today and tomorrow', () => {
    expect(dueLabel('2026-10-05', MONDAY)).toMatchObject({ text: 'hoy', tone: 'today' });
    expect(dueLabel('2026-10-06', MONDAY)).toMatchObject({ text: 'mañana', tone: 'tomorrow' });
  });

  test('later this week: weekday and day; a week or more out also gets the month', () => {
    expect(dueLabel('2026-10-07', MONDAY)).toMatchObject({ text: 'vence mié 7', tone: 'later' });
    expect(dueLabel('2026-10-11', MONDAY)).toMatchObject({ text: 'vence dom 11' });
    expect(dueLabel('2026-10-14', MONDAY)).toMatchObject({ text: 'vence mié 14 oct' });
  });

  test('a YYYY-MM-DD date is a local calendar day, not UTC midnight', () => {
    // Late evening in Mexico is already the next day in UTC.
    const lateSunday = new Date(2026, 9, 4, 23, 30);
    expect(dueLabel('2026-10-04', lateSunday)?.text).toBe('hoy');
    expect(dueLabel('2026-10-05', lateSunday)?.text).toBe('mañana');
  });

  test('crosses month and year boundaries', () => {
    expect(dueLabel('2026-11-01', new Date(2026, 9, 31))?.text).toBe('mañana');
    expect(dueLabel('2026-12-30', new Date(2027, 0, 2))?.text).toBe('atrasado 3 días');
  });

  test('no date or a bad date: no label', () => {
    expect(dueLabel(null, MONDAY)).toBeNull();
    expect(dueLabel('', MONDAY)).toBeNull();
    expect(dueLabel('mañana', MONDAY)).toBeNull();
    expect(dueLabel('2026-02-31', MONDAY)).toBeNull();
  });

  test('accepts an ISO datetime by its date part', () => {
    expect(dueLabel('2026-10-06T00:00:00', MONDAY)?.text).toBe('mañana');
  });
});

describe('week helpers', () => {
  test('end of week is this Sunday (today when it is Sunday)', () => {
    expect(toYmd(endOfWeek(MONDAY))).toBe('2026-10-11');
    expect(toYmd(endOfWeek(new Date(2026, 9, 10)))).toBe('2026-10-11');
    expect(toYmd(endOfWeek(new Date(2026, 9, 11)))).toBe('2026-10-11');
  });

  test('quick due chips', () => {
    expect(quickDueOptions(MONDAY)).toEqual([
      { label: 'Hoy', ymd: '2026-10-05', hint: 'lun 5' },
      { label: 'Mañana', ymd: '2026-10-06', hint: 'mar 6' },
      { label: 'Viernes', ymd: '2026-10-09', hint: 'vie 9' },
      { label: 'Próx. lunes', ymd: '2026-10-12', hint: 'lun 12' },
    ]);
    // On a Friday «Viernes» is next week's, never today.
    const friday = quickDueOptions(new Date(2026, 9, 9));
    expect(friday.find((o) => o.label === 'Viernes')?.ymd).toBe('2026-10-16');
    expect(friday.find((o) => o.label === 'Próx. lunes')?.ymd).toBe('2026-10-12');
  });

  test('parseYmd', () => {
    expect(toYmd(parseYmd('2026-10-07')!)).toBe('2026-10-07');
    expect(parseYmd(undefined)).toBeNull();
  });
});

describe('owners', () => {
  test('logged-in account → first name', () => {
    expect(ownerForUser({ email: 'impagtodoparaelcampo@gmail.com', name: 'IMPAG Todo para el campo' })).toBe('Hernán');
    expect(ownerForUser({ email: 'JuanDanielBetancourt@gmail.com', name: 'Juan Daniel Betancourt' })).toBe('JD');
    expect(ownerForUser({ email: 'juandanielbetancourtg@gmail.com', name: 'Juan Daniel' })).toBe('Daniel');
    expect(ownerForUser({ email: 'jared.zena@resilia.com', name: 'Jared Zena' })).toBe('Jared');
    expect(ownerForUser({ email: 'otra@example.com', name: 'Hernan Pérez' })).toBe('Hernán');
    expect(ownerForUser({ email: 'dev@local.test', name: 'Dev User' })).toBeNull();
    expect(ownerForUser(null)).toBeNull();
  });

  test('owner names compare without case or accents', () => {
    expect(normalizeOwner('hernan')).toBe('Hernán');
    expect(normalizeOwner(' jd ')).toBe('JD');
    expect(normalizeOwner('Pedro')).toBe('Pedro');
    expect(normalizeOwner('  ')).toBeNull();
    expect(sameOwner('HERNÁN', 'Hernán')).toBe(true);
    expect(sameOwner(null, 'Hernán')).toBe(false);
  });
});

describe('groupNextSteps', () => {
  const q = (id: number, due: string | null, next_action: string | null = `Paso ${id}`) =>
    ({ id, next_action, next_action_due: due, next_action_owner: 'Hernán' }) as unknown as Quote;

  test('overdue / today / rest of the week, by date; nothing past Sunday or without a step', () => {
    const groups = groupNextSteps(
      [q(1, '2026-10-09'), q(2, '2026-10-05'), q(3, '2026-10-01'), q(4, '2026-10-12'), q(5, null), q(6, '2026-10-04', null), q(7, '2026-10-06'), q(8, '2026-10-04')],
      MONDAY,
    );
    expect(groups.overdue.map((x) => x.id)).toEqual([3, 8]);
    expect(groups.today.map((x) => x.id)).toEqual([2]);
    expect(groups.week.map((x) => x.id)).toEqual([7, 1]);
  });
});
