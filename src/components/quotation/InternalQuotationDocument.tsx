import React from 'react';
import dayjs from 'dayjs';
import { ParsedInternalQuotation } from '@/utils/quotationParser';

interface InternalQuotationDocumentProps {
  quotation: ParsedInternalQuotation;
  fecha?: Date;
}

const InternalQuotationDocument: React.FC<InternalQuotationDocumentProps> = ({
  quotation,
  fecha = new Date()
}) => {
  const { title, sections, tables, notes, hasTable } = quotation;

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

  return (
    <div id={`internal-quotation-${Date.now()}`} className="bg-white rounded-lg">
      {/* Header with Date */}
      <div className="text-right text-gray-500 text-xs mb-4">
        <p>Fecha: {dayjs(fecha).format('DD/MM/YYYY')}</p>
      </div>

      {/* Title */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {title || 'Cotización Interna'}
        </h2>
        <p className="text-xs text-gray-600 italic">Uso interno - No compartir con cliente</p>
      </div>

      {/* Characteristics/Description */}
      {sections.length > 0 && sections[0].content.length > 0 && (
        <div className="mb-5">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">
            Características principales:
          </h3>
          <div className="text-gray-700 text-xs space-y-1">
            {sections[0].content.slice(0, 6).map((line, idx) => (
              <p key={idx}>{line.replace(/\*\*/g, '')}</p>
            ))}
          </div>
        </div>
      )}

      {/* Tables */}
      {tables.map((tableItems, tableIdx) => (
        <div key={tableIdx} className="mb-5">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">
            Detalles de Productos
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">
                    Descripción
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">
                    Proveedor
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-900">
                    Costo Unitario
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-900">
                    Margen
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-900">
                    Precio Unitario
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-900">
                    Cantidad
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 text-gray-700">
                      {item.descripcion}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-700">
                      {item.proveedor}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-700">
                      {item.costoUnitario}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-700">
                      {item.margen}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-700">
                      {item.precioUnitario}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-700">
                      {item.cantidad}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900">
                      {item.importe}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Notes/Additional Information */}
      {notes.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">
            Notas Internas:
          </h3>
          <div className="text-gray-600 text-xs space-y-2">
            {notes.map((note, idx) => (
              <p key={idx} className="leading-relaxed">
                {note.replace(/\*\*/g, '')}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Company Footer */}
      <div className="mt-6 pt-5 border-t border-gray-200 text-center text-gray-500 text-xs">
        <p className="font-semibold text-gray-700">IMPAG - Uso Interno</p>
        <p>Calle José Ramón Valdez 404, Nuevo Ideal, Durango, México C.P 34410</p>
        <p>Tel: 677 119 77 37 • Email: impaqtodoparaelcampo@gmail.com</p>
      </div>
    </div>
  );
};

export default InternalQuotationDocument;

