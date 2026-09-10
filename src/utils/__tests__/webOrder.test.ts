import { describe, expect, test } from 'vitest';
import {
  chargedDiffersFromTotal,
  formatAddress,
  getPaymentChip,
  isWebOrder,
  notificationDotClass,
  parseWebOrderNotes,
  paymentMethodLabel,
  stripWebOrderBlock,
  warningLabel,
} from '../webOrder';

const ORDER = {
  delivery: {
    method: 'paqueteria',
    address: {
      street: 'Av. Hidalgo',
      number: '120',
      colonia: 'Centro',
      cp: '34410',
      municipio: 'Nuevo Ideal',
      estado: 'Durango',
      references: 'Portón verde',
    },
    cost_total: 180,
  },
  invoice: {
    requires_invoice: true,
    type: 'a_nombre',
    rfc: 'pepj800101ab1',
    razon_social: 'JUAN PEREZ PEREZ',
    regimen_fiscal: '612',
    cp_fiscal: '34410',
    uso_cfdi: 'g03',
    email: 'facturas@example.com',
  },
};

describe('isWebOrder', () => {
  test('detects the WEB- prefix, case-insensitive', () => {
    expect(isWebOrder({ quote_number: 'WEB-260910-7K3QX9' })).toBe(true);
    expect(isWebOrder({ quote_number: ' web-260910-7K3QX9' })).toBe(true);
  });
  test('regular quotes are not web orders', () => {
    expect(isWebOrder({ quote_number: 'TEC-2026-0001' })).toBe(false);
    expect(isWebOrder({ quote_number: 'COT-IMPAG-120626DGO' })).toBe(false);
    expect(isWebOrder(null)).toBe(false);
  });
});

describe('getPaymentChip', () => {
  test('maps payment states to chips', () => {
    expect(getPaymentChip('approved')).toEqual({ tone: 'paid', label: 'Pagado en línea' });
    expect(getPaymentChip('pending')).toEqual({ tone: 'pending', label: 'Pago pendiente' });
    expect(getPaymentChip('in_process')?.label).toBe('Pago pendiente');
    for (const s of ['mismatch', 'amount_mismatch', 'refunded', 'charged_back']) {
      expect(getPaymentChip(s)).toEqual({ tone: 'problem', label: 'Revisar pago' });
    }
  });
  test('no chip for absent, open-cart, failed or unknown states', () => {
    for (const s of [undefined, null, '', 'checkout', 'rejected', 'cancelled', 'constructor', 'toString', 42]) {
      expect(getPaymentChip(s)).toBeNull();
    }
  });
});

describe('notificationDotClass', () => {
  test('green for accepted/paid, red for problems, yellow otherwise', () => {
    expect(notificationDotClass('quote_accepted')).toBe('bg-green-500');
    expect(notificationDotClass('web_order_paid')).toBe('bg-green-500');
    expect(notificationDotClass('web_order_problem')).toBe('bg-red-500');
    expect(notificationDotClass('web_order_pending')).toBe('bg-yellow-500');
    expect(notificationDotClass('quote_viewed')).toBe('bg-yellow-500');
  });
});

describe('paymentMethodLabel', () => {
  test('formats Mercado Pago methods', () => {
    expect(paymentMethodLabel('mercadopago:ticket:oxxo')).toBe('Mercado Pago · Efectivo (ticket) · OXXO');
    expect(paymentMethodLabel('mercadopago:credit_card')).toBe('Mercado Pago · Tarjeta de crédito');
    expect(paymentMethodLabel('mercadopago')).toBe('Mercado Pago');
  });
  test('passes other values through and ignores empty ones', () => {
    expect(paymentMethodLabel('efectivo')).toBe('efectivo');
    expect(paymentMethodLabel(null)).toBeNull();
    expect(paymentMethodLabel('  ')).toBeNull();
  });
});

describe('parseWebOrderNotes', () => {
  test('bare JSON notes', () => {
    const parsed = parseWebOrderNotes(JSON.stringify(ORDER));
    expect(parsed?.delivery?.method).toBe('paqueteria');
    expect(parsed?.delivery?.cost_total).toBe(180);
    expect(parsed?.invoiceRequested).toBe(true);
    expect(parsed?.invoice?.rfc).toBe('PEPJ800101AB1');
    expect(parsed?.invoice?.uso_cfdi).toBe('G03');
  });

  test('JSON between markers, with human text around it', () => {
    const json = JSON.stringify(ORDER, null, 2);
    const notes = `[Pedido web WEB-260910-7K3QX9 · todoparaelcampo.com.mx]\n${json}\n[/Pedido web]\n\nLlamar antes de enviar {urgente}`;
    const parsed = parseWebOrderNotes(notes);
    expect(parsed?.raw).toBe(json);
    expect(parsed?.delivery?.address?.municipio).toBe('Nuevo Ideal');
    expect(stripWebOrderBlock(notes, parsed!.raw)).toBe('Llamar antes de enviar {urgente}');
  });

  test('fenced ```json block and nested pedido_web key', () => {
    const json = JSON.stringify({ v: 1, pedido_web: { delivery: { method: 'recoger', address: null, cost_total: 0 }, invoice: null } });
    const notes = `Nota de Hernán\n\`\`\`json\n${json}\n\`\`\``;
    const parsed = parseWebOrderNotes(notes);
    expect(parsed?.delivery).toEqual({ method: 'recoger', address: null, cost_total: 0 });
    expect(parsed?.invoiceRequested).toBe(false);
    expect(parsed?.invoice).toBeNull();
    expect(stripWebOrderBlock(notes, parsed!.raw)).toBe('Nota de Hernán');
  });

  test('skips unrelated JSON and unbalanced human braces before the block', () => {
    const notes = `ver {pendiente\n{"otro": true}\n${JSON.stringify({ delivery: { method: 'flete' } })}`;
    expect(parseWebOrderNotes(notes)?.delivery?.method).toBe('flete');
  });

  test('braces inside JSON strings do not break the scan', () => {
    const order = { delivery: { method: 'recoger', address: { references: 'casa {azul}' } } };
    expect(parseWebOrderNotes(JSON.stringify(order))?.delivery?.address?.references).toBe('casa {azul}');
  });

  test('requires_invoice false means no invoice', () => {
    const parsed = parseWebOrderNotes(JSON.stringify({ invoice: { requires_invoice: false, rfc: 'X' } }));
    expect(parsed?.invoiceRequested).toBe(false);
    expect(parsed?.delivery).toBeNull();
  });

  test('returns null when absent, invalid or empty', () => {
    expect(parseWebOrderNotes(null)).toBeNull();
    expect(parseWebOrderNotes(undefined)).toBeNull();
    expect(parseWebOrderNotes('')).toBeNull();
    expect(parseWebOrderNotes('Entregar el lunes, pagó en efectivo')).toBeNull();
    expect(parseWebOrderNotes('{"delivery": {"method": "recoger"')).toBeNull(); // truncated
    expect(parseWebOrderNotes('{delivery: recoger}')).toBeNull(); // not JSON
    expect(parseWebOrderNotes('{"delivery": "recoger"}')).toBeNull(); // wrong shape
    expect(parseWebOrderNotes('{"delivery": {}, "foo": 1}')).toBeNull(); // nothing to show
    expect(parseWebOrderNotes('[{"delivery": {"method": "recoger"}}]')?.delivery?.method).toBe('recoger');
  });

  test('ignores non-finite or non-numeric costs', () => {
    const parsed = parseWebOrderNotes('{"delivery": {"method": "paqueteria", "cost_total": "abc"}}');
    expect(parsed?.delivery?.cost_total).toBeNull();
  });
});

describe('formatAddress', () => {
  test('joins the parts that exist', () => {
    expect(formatAddress(parseWebOrderNotes(JSON.stringify(ORDER))!.delivery!.address!)).toBe(
      'Av. Hidalgo 120, Col. Centro, CP 34410, Nuevo Ideal, Durango',
    );
  });
});

// Exactly what impag-quot stores: write_notes_block(notes, ref, _block_data(...))
// → "[Pedido web <ref>]\n<json.dumps(indent=2)>\n[/Pedido web]", human text after.
const REF = 'WEB-260910-7K3QX9';
function backendNotes(block: Record<string, unknown>, human = ''): string {
  const text = `[Pedido web ${REF}]\n${JSON.stringify(block, null, 2)}\n[/Pedido web]`;
  return human ? `${text}\n\n${human}` : text;
}
const MP_PAYMENT = {
  provider: 'mercadopago',
  preference_id: '123-abc',
  payment_id: '111',
  status: 'approved',
  status_detail: 'accredited',
  payment_type_id: 'credit_card',
  payment_method_id: 'visa',
  transaction_amount: 349.28,
  date_approved: '2026-09-10T10:00:00.000-06:00',
  live_mode: true,
};

describe('backend notes block (payment + warnings)', () => {
  test('reads the warnings and the amount Mercado Pago charged', () => {
    const notes = backendNotes(
      {
        v: 1,
        ref: REF,
        delivery: ORDER.delivery,
        invoice: { requires_invoice: false },
        payment: MP_PAYMENT,
        warnings: ['iva_mismatch:371', 'no_task_user'],
      },
      'Llamar antes de enviar',
    );
    const parsed = parseWebOrderNotes(notes)!;
    expect(parsed.warnings).toEqual(['iva_mismatch:371', 'no_task_user']);
    expect(parsed.chargedAmount).toBe(349.28);
    expect(parsed.orderDataMissing).toBe(false);
    expect(parsed.invoiceRequested).toBe(false);
    // The block is hidden from "Notas", so the panel is the only place these show.
    expect(stripWebOrderBlock(notes, parsed.raw)).toBe('Llamar antes de enviar');
  });

  test('a checkout without invoice (invoice null next to delivery) still means "no invoice"', () => {
    const parsed = parseWebOrderNotes(
      backendNotes({ v: 1, ref: REF, delivery: ORDER.delivery, invoice: null, payment: null, warnings: [] }),
    )!;
    expect(parsed.invoiceRequested).toBe(false);
    expect(parsed.orderDataMissing).toBe(false);
    expect(parsed.chargedAmount).toBeNull();
    expect(parsed.warnings).toEqual([]);
  });

  test('a payment recorded without the order data is flagged; invoice is unknown, not "no"', () => {
    const notes = backendNotes({
      v: 1,
      ref: REF,
      delivery: null,
      invoice: null,
      payment: MP_PAYMENT,
      warnings: ['order_data_missing'],
    });
    const parsed = parseWebOrderNotes(notes)!;
    expect(parsed).not.toBeNull();
    expect(parsed.delivery).toBeNull();
    expect(parsed.invoiceRequested).toBeNull();
    expect(parsed.orderDataMissing).toBe(true);
    expect(parsed.chargedAmount).toBe(349.28);
    expect(parsed.warnings).toEqual(['order_data_missing']);
    expect(stripWebOrderBlock(notes, parsed.raw)).toBe('');
  });

  test('a block with only a payment still counts, even with no warnings', () => {
    const parsed = parseWebOrderNotes(backendNotes({ v: 1, ref: REF, payment: { status: 'pending', transaction_amount: null } }));
    expect(parsed?.orderDataMissing).toBe(true);
    expect(parsed?.chargedAmount).toBeNull();
  });

  test('keeps only non-empty string warnings, once each', () => {
    const parsed = parseWebOrderNotes(
      JSON.stringify({ delivery: { method: 'recoger' }, warnings: ['a', ' a ', '', 7, null, { x: 1 }, 'b'] }),
    );
    expect(parsed?.warnings).toEqual(['a', 'b']);
    expect(parseWebOrderNotes(JSON.stringify({ delivery: { method: 'recoger' }, warnings: 'x' }))?.warnings).toEqual([]);
  });

  test('ignores a negative or non-numeric charged amount', () => {
    const notes = (amount: unknown) =>
      JSON.stringify({ delivery: { method: 'recoger' }, payment: { transaction_amount: amount } });
    expect(parseWebOrderNotes(notes(-1))?.chargedAmount).toBeNull();
    expect(parseWebOrderNotes(notes('abc'))?.chargedAmount).toBeNull();
    expect(parseWebOrderNotes(notes('349.28'))?.chargedAmount).toBe(349.28);
  });
});

describe('warningLabel', () => {
  test('translates backend codes and keeps the detail after the colon', () => {
    expect(warningLabel('totals_differ_from_recorded_order')).toBe('El pago trae un total distinto al del pedido registrado');
    expect(warningLabel('iva_mismatch:371')).toBe('El IVA del producto no coincide con el catálogo (371)');
    expect(warningLabel('additional_approved_payment:222')).toBe('Mercado Pago aprobó otro pago para este pedido (222)');
  });
  test('shows unknown codes as they are, never hides them', () => {
    expect(warningLabel('order_data_missing')).toBe('order_data_missing');
    expect(warningLabel('constructor')).toBe('constructor');
  });
});

describe('chargedDiffersFromTotal', () => {
  test('one centavo of tolerance, like the backend', () => {
    expect(chargedDiffersFromTotal(349.28, 349.28)).toBe(false);
    expect(chargedDiffersFromTotal(349.29, 349.28)).toBe(false);
    expect(chargedDiffersFromTotal(0.1 + 0.2, 0.3)).toBe(false);
    expect(chargedDiffersFromTotal(349.3, 349.28)).toBe(true);
    expect(chargedDiffersFromTotal(349.28, 0)).toBe(true);
  });
  test('cannot tell without valid numbers', () => {
    expect(chargedDiffersFromTotal(Number.NaN, 349.28)).toBe(false);
    expect(chargedDiffersFromTotal(349.28, Number.NaN)).toBe(false);
  });
});
