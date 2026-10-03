import { expect, test } from 'vitest';
import { friendlyErrorMessage } from '@/utils/api';

test('keeps a Spanish detail from the backend as is', () => {
  expect(friendlyErrorMessage(400, JSON.stringify({ detail: 'No reconozco el mensaje *Venta*' }))).toBe(
    'No reconozco el mensaje *Venta*'
  );
});

test('translates the English details the team can hit', () => {
  expect(friendlyErrorMessage(404, JSON.stringify({ detail: 'Quote not found' }))).toMatch(/No se encontró la cotización/);
  expect(friendlyErrorMessage(400, JSON.stringify({ detail: 'Only draft quotes can be deleted' }))).toBe(
    'Solo se pueden borrar cotizaciones en borrador.'
  );
});

test('validation errors name the field instead of [object Object]', () => {
  const body = JSON.stringify({ detail: [{ loc: ['body', 'text'], msg: 'Field required', type: 'missing' }] });
  expect(friendlyErrorMessage(422, body)).toBe('Revisa los datos: falta o no es válido «text».');
});

test('an HTML error page becomes one plain sentence', () => {
  expect(friendlyErrorMessage(502, '<html><body>Bad Gateway</body></html>')).toBe(
    'El servidor tuvo un problema. Espera un minuto e intenta de nuevo.'
  );
});
