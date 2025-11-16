/**
 * Parses markdown quotation content into structured data
 */

export interface QuotationItem {
  descripcion: string;
  unidad: string;
  cantidad: string;
  precioUnitario: string;
  importe: string;
}

export interface QuotationSection {
  title: string;
  content: string[];
}

export interface ParsedQuotation {
  title: string;
  sections: QuotationSection[];
  tables: QuotationItem[][];
  notes: string[];
  hasTable: boolean;
}

export function parseQuotationMarkdown(markdown: string): ParsedQuotation {
  const lines = markdown.split('\n');
  
  let title = '';
  const sections: QuotationSection[] = [];
  const tables: QuotationItem[][] = [];
  const notes: string[] = [];
  
  let currentSection: QuotationSection | null = null;
  let inTable = false;
  let tableHeaders: string[] = [];
  let currentTable: QuotationItem[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Extract main title (# Title)
    if (line.startsWith('# ') && !title) {
      title = line.replace('# ', '').trim();
      continue;
    }
    
    // Extract section headers (## Section)
    if (line.startsWith('## ')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace('## ', '').trim(),
        content: []
      };
      inTable = false;
      continue;
    }
    
    // Extract subsection headers (### Subsection)
    if (line.startsWith('### ')) {
      if (currentSection) {
        currentSection.content.push(`**${line.replace('### ', '').trim()}**`);
      }
      continue;
    }
    
    // Detect table start
    if (line.includes('|') && !inTable) {
      // Check if this is a header row
      if (line.toLowerCase().includes('descripción') || 
          line.toLowerCase().includes('producto') ||
          line.toLowerCase().includes('concepto')) {
        inTable = true;
        tableHeaders = line.split('|').map(h => h.trim()).filter(h => h);
        // Skip the separator line
        i++;
        if (currentTable.length > 0) {
          tables.push([...currentTable]);
          currentTable = [];
        }
        continue;
      }
    }
    
    // Parse table rows
    if (inTable && line.includes('|')) {
      // Skip separator lines
      if (line.includes('---') || line.includes(':---:')) {
        continue;
      }
      
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      
      if (cells.length >= 3) {
        // Flexible column mapping based on number of columns
        let item: QuotationItem;
        
        if (cells.length >= 7) {
          // 7 columns: Concepto | Ancho | Largo | Cantidad | Unidad | Precio | Subtotal
          item = {
            descripcion: `${cells[0]} ${cells[1]}`.trim(), // Combine name + ancho
            unidad: cells[4] || 'PIEZA',
            cantidad: cells[3] || '1',
            precioUnitario: cells[5] || 'Consultar',
            importe: cells[6] || 'Consultar'
          };
        } else if (cells.length === 6) {
          // 6 columns: Could be various formats
          // Common: Concepto | Ancho | Largo | Cantidad | Precio | Subtotal
          item = {
            descripcion: `${cells[0]} ${cells[1]}`.trim(),
            unidad: 'Rollo',
            cantidad: cells[3] || '1',
            precioUnitario: cells[4] || 'Consultar',
            importe: cells[5] || 'Consultar'
          };
        } else if (cells.length === 5) {
          // Standard 5 columns: Descripción | Unidad | Cantidad | Precio | Importe
          item = {
            descripcion: cells[0] || '',
            unidad: cells[1] || 'PIEZA',
            cantidad: cells[2] || '1',
            precioUnitario: cells[3] || 'Consultar',
            importe: cells[4] || 'Consultar'
          };
        } else if (cells.length === 4) {
          // 4 columns: Descripción | Cantidad | Precio | Importe
          item = {
            descripcion: cells[0] || '',
            unidad: 'PIEZA',
            cantidad: cells[1] || '1',
            precioUnitario: cells[2] || 'Consultar',
            importe: cells[3] || 'Consultar'
          };
        } else {
          // 3 columns: Producto | Precio | Total
          item = {
            descripcion: cells[0] || '',
            unidad: 'PIEZA',
            cantidad: '1',
            precioUnitario: cells[1] || 'Consultar',
            importe: cells[2] || 'Consultar'
          };
        }
        
        // Clean up the data
        item.descripcion = item.descripcion.replace(/\*\*/g, '').trim();
        
        // Skip if it's obviously a header row that got through
        if (item.descripcion.toLowerCase().includes('descripción') ||
            item.descripcion.toLowerCase().includes('concepto')) {
          continue;
        }
        
        currentTable.push(item);
      }
    } else if (inTable && !line.includes('|')) {
      // End of table
      if (currentTable.length > 0) {
        tables.push([...currentTable]);
        currentTable = [];
      }
      inTable = false;
    }
    
    // Collect content for current section
    if (currentSection && !inTable && !line.startsWith('#')) {
      // Check for notes/important sections
      if (line.startsWith('✅') || line.startsWith('📋') || line.startsWith('🔧') || 
          line.startsWith('📞') || line.startsWith('*') || line.startsWith('-')) {
        notes.push(line);
      } else if (line.includes('**') || line.length > 10) {
        currentSection.content.push(line);
      }
    }
  }
  
  // Push last section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // Push last table
  if (currentTable.length > 0) {
    tables.push(currentTable);
  }
  
  return {
    title,
    sections,
    tables,
    notes,
    hasTable: tables.length > 0 && tables[0].length > 0
  };
}

/**
 * Extracts characteristics/specifications from markdown
 */
export function extractCharacteristics(markdown: string): string[] {
  const lines = markdown.split('\n');
  const characteristics: string[] = [];
  
  let inCharacteristics = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.toLowerCase().includes('características') || 
        trimmed.toLowerCase().includes('especificaciones')) {
      inCharacteristics = true;
      continue;
    }
    
    if (inCharacteristics) {
      // Stop at next major section or table
      if (trimmed.startsWith('##') || trimmed.includes('|')) {
        break;
      }
      
      // Collect bullet points or dash points
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
        const clean = trimmed.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '');
        if (clean.length > 0) {
          characteristics.push(clean);
        }
      }
    }
  }
  
  return characteristics;
}

