import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { ParsedQuotation } from '@/utils/quotationParser';
import { numberToWords } from '@/utils/numberToWords';
import impagLogo from '@/assets/impag.png';
import jdFirma from '@/assets/jd_firma.png';

interface QuotationDocumentProps {
  quotation: ParsedQuotation;
  fecha?: Date;
  customerName?: string;
  customerLocation?: string;
  quotationId?: string;
}

// Generate quotation ID from date and random number
function generateQuotationId(): string {
  const date = dayjs();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const dateStr = date.format('DDMMYY');
  return `${random}${dateStr}`;
}

// Extract numeric value from price string
function extractPrice(priceStr: string): number {
  if (!priceStr || priceStr === 'Consultar') return 0;
  // Remove $, MXN, commas, and spaces
  const cleaned = priceStr.replace(/[$,\sMXN]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

const QuotationDocument: React.FC<QuotationDocumentProps> = ({
  quotation,
  fecha = new Date(),
  customerName,
  customerLocation,
  quotationId
}) => {
  const { title, sections, tables, notes, hasTable } = quotation;

  // Generate quotation ID if not provided
  const finalQuotationId = quotationId || generateQuotationId();

  // Calculate total from table items
  const total = useMemo(() => {
    if (!hasTable || tables.length === 0) return 0;
    return tables[0].reduce((sum, item) => {
      return sum + extractPrice(item.importe);
    }, 0);
  }, [tables, hasTable]);

  // If there's no structured table data, fall back to simple display
  if (!hasTable) {
    return (
      <div className="bg-white rounded-lg">
        <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
          {sections.map((section, idx) => (
            <div key={idx}>
              {section.title && (
                <h3 className="font-semibold text-gray-900 mb-2">{section.title}</h3>
              )}
              {section.content.map((line, lineIdx) => (
                <p key={lineIdx} className="mb-1">{line}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Generate a stable ID for PDF export
  const quotationElementId = `quotation-doc-${finalQuotationId}`;

  return (
    <div
      id={quotationElementId}
      className="bg-white rounded-lg p-6"
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '210mm', // A4 width
        margin: '0 auto',
        fontSize: '11px', // Smaller base font for PDF
        lineHeight: '1.4'
      }}
    >
      {/* Header with Logo and Subject */}
      <div className="flex justify-between items-start mb-6">
        {/* Logo */}
        <div className="flex-shrink-0">
          <img src={impagLogo} alt="IMPAG" className="h-16 w-auto" />
        </div>

        {/* Subject and Date */}
        <div className="text-right">
          <div className="mb-2">
            <p className="text-sm font-semibold text-gray-700">Asunto: <span className="font-normal">Cotización {finalQuotationId}</span></p>
            <p className="text-sm font-semibold text-gray-700">Fecha: <span className="font-normal">{dayjs(fecha).format('DD/MM/YYYY')}</span></p>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-6">
        <p className="text-sm text-gray-700 mb-1">
          <span className="font-semibold">En atención a:</span> {customerName || 'A quien corresponda'}.
        </p>
        {customerLocation && (
          <p className="text-sm text-gray-700 mb-1">
            <span className="font-semibold">Ubicación:</span> {customerLocation}.
          </p>
        )}
        <p className="text-sm font-semibold text-gray-700 mb-4">PRESENTE</p>
        <p className="text-sm text-gray-700">
          En respuesta a su atenta solicitud, se presenta la siguiente cotización de {title || 'productos'}.
        </p>
      </div>

      {/* Tables */}
      {tables.map((tableItems, tableIdx) => (
        <div key={tableIdx} className="mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-black" style={{ fontSize: '10px' }}>
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="border border-black px-2 py-2 text-left font-semibold" style={{ width: '40%' }}>
                    CONCEPTO
                  </th>
                  <th className="border border-black px-2 py-2 text-center font-semibold" style={{ width: '12%' }}>
                    UNIDAD
                  </th>
                  <th className="border border-black px-2 py-2 text-center font-semibold" style={{ width: '12%' }}>
                    CANTIDAD
                  </th>
                  <th className="border border-black px-2 py-2 text-right font-semibold" style={{ width: '18%' }}>
                    P. UNITARIO
                  </th>
                  <th className="border border-black px-2 py-2 text-right font-semibold" style={{ width: '18%' }}>
                    IMPORTE
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableItems.map((item, idx) => {
                  // Split description by newlines or \n
                  const descLines = item.descripcion.split(/\n|\\n/).filter(line => line.trim());
                  const mainDesc = descLines[0] || item.descripcion;
                  const specs = descLines.slice(1).slice(0, 6); // Limit to max 6 specs

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border border-black px-2 py-2 text-gray-700">
                        <div className="font-semibold mb-1">{mainDesc}</div>
                        {specs.length > 0 && (
                          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                            {specs.map((line, i) => (
                              <div key={i}>{line.trim()}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="border border-black px-2 py-2 text-center text-gray-700">
                        {item.unidad}
                      </td>
                      <td className="border border-black px-2 py-2 text-center text-gray-700">
                        {item.cantidad}
                      </td>
                      <td className="border border-black px-2 py-2 text-right text-gray-700">
                        {item.precioUnitario}
                      </td>
                      <td className="border border-black px-2 py-2 text-right font-semibold text-gray-900">
                        {item.importe}
                      </td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="bg-blue-700 text-white">
                  <td colSpan={4} className="border border-black px-2 py-2 text-right font-bold">
                    Total
                  </td>
                  <td className="border border-black px-2 py-2 text-right font-bold">
                    ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="mt-4">
            <p className="text-sm text-gray-700 font-semibold">
              ({numberToWords(total)})
            </p>
          </div>
        </div>
      ))}

      {/* Signature - Above Notes */}
      <div className="mt-8 pt-6 text-center">
        <p className="text-sm text-gray-700 mb-4">Atentamente</p>
        <div className="mb-2 flex justify-center">
          <img src={jdFirma} alt="Firma" className="h-24 w-auto" />
        </div>
        <p className="text-sm font-semibold text-gray-900">Juan Daniel Betancourt González</p>
        <p className="text-sm text-gray-700">Director de proyectos</p>
      </div>

      {/* Notes Section */}
      <div className="mt-8 pt-6 border-t-2 border-gray-300">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Nota:</h3>
        {(() => {
          const noteItems = notes.length > 0 ? (
            // Use AI-generated notes if available
            notes.map((note, idx) => {
              // Remove emojis and clean up note text
              // Remove common emojis and markdown formatting
              const noteText = note
                .replace(/\*\*/g, '')
                .replace(/[✅📋🔧📞📌💡⚠️🔔📝📄📊💰🚚📦🏭🌾]/g, '')
                .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emoji range
                .replace(/[\u{2600}-\u{26FF}]/gu, '') // Remove misc symbols
                .replace(/[\u{2700}-\u{27BF}]/gu, '') // Remove dingbats
                .trim();
              const isImportant = noteText.includes('Entrega') || noteText.includes('montacargas') || noteText.includes('envío') || noteText.includes('Incluye');
              return (
                <li key={idx} className={isImportant ? 'font-bold text-red-600' : 'font-bold'}>
                  {noteText}
                </li>
              );
            })
          ) : (
            // Fallback to standard notes
            <>
              <li className="font-bold">Cotización vigente durante 3 días hábiles, solicitar actualización una vez finalizado el periodo.</li>
              <li className="font-bold">Condiciones de pago en una sola exhibición.</li>
              <li className="font-bold">Los tiempos de entrega serán agendados una vez confirmado el pedido.</li>
              {customerLocation && (
                <li className="font-bold text-red-600">Entrega en {customerLocation}, Zona Urbana.</li>
              )}
              <li className="font-bold text-red-600">Paquete sobredimensionado se requiere montacargas y personal capacitado para maniobrar.</li>
              <li className="font-bold text-red-600">Incluye envío.</li>
              <li className="font-bold">La maniobra de descarga y el resguardo del material es responsabilidad del cliente.</li>
              <li className="font-bold">Favor de indicar el USO del CFDI, ya que una vez emitida la factura no se podrá modificar.</li>
            </>
          );

          const totalNotes = notes.length > 0 ? notes.length : (customerLocation ? 8 : 7);
          const useTwoColumns = totalNotes > 8;

          return (
            <ul className={`text-sm text-gray-700 space-y-2 list-disc ${useTwoColumns ? 'grid grid-cols-2 gap-x-8' : 'list-inside'}`}>
              {noteItems}
            </ul>
          );
        })()}

        {/* Bank Details */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <h4 className="text-sm font-bold text-gray-900 mb-3">DATOS BANCARIOS</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p className="font-semibold">DATOS BANCARIOS IMPAG TECH SAPI DE C V</p>
            <p className="font-semibold">BBVA BANCOMER</p>
            <p><span className="font-semibold">CUENTA CLABE:</span> 012 180 001193473561</p>
            <p><span className="font-semibold">NUMERO DE CUENTA:</span> 011 934 7356</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationDocument;
