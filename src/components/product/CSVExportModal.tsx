import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ColumnOption } from '@/utils/csvExport';

interface CSVExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selectedColumns: string[]) => void;
  columns: ColumnOption[];
  title?: string;
}

const CSVExportModal: React.FC<CSVExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  columns,
  title = 'Exportar a CSV'
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Initialize with default selected columns
  useEffect(() => {
    if (isOpen) {
      const defaultSelected = columns
        .filter(col => col.defaultSelected !== false)
        .map(col => col.key);
      setSelectedColumns(defaultSelected.length > 0 ? defaultSelected : columns.map(col => col.key));
    }
  }, [isOpen, columns]);

  const handleToggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelectedColumns(columns.map(col => col.key));
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handleExport = () => {
    if (selectedColumns.length === 0) {
      alert('Por favor selecciona al menos una columna para exportar');
      return;
    }
    onExport(selectedColumns);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              Seleccionar Todo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="text-xs"
            >
              Deseleccionar Todo
            </Button>
            <div className="ml-auto text-sm text-gray-600">
              {selectedColumns.length} de {columns.length} columnas seleccionadas
            </div>
          </div>

          <div className="space-y-2">
            {columns.map(column => (
              <label
                key={column.key}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(column.key)}
                  onChange={() => handleToggleColumn(column.key)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">{column.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedColumns.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CSVExportModal;

