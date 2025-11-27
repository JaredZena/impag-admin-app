/**
 * Converts a number to words in Spanish (Mexican format)
 */

const units = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const hundreds = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertHundreds(num: number): string {
  if (num === 0) return '';
  if (num === 100) return 'CIEN';
  
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  
  let result = '';
  if (hundred > 0) {
    if (hundred === 1 && remainder > 0) {
      result = 'CIENTO';
    } else {
      result = hundreds[hundred];
    }
  }
  
  if (remainder > 0) {
    if (result) result += ' ';
    result += convertTens(remainder);
  }
  
  return result;
}

function convertTens(num: number): string {
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  
  const ten = Math.floor(num / 10);
  const unit = num % 10;
  
  if (ten === 2 && unit > 0) {
    return 'VEINTI' + units[unit].toLowerCase();
  }
  
  let result = tens[ten];
  if (unit > 0) {
    result += ' Y ' + units[unit];
  }
  
  return result;
}

function convertThousands(num: number): string {
  if (num < 1000) {
    return convertHundreds(num);
  }
  
  const thousand = Math.floor(num / 1000);
  const remainder = num % 1000;
  
  let result = '';
  if (thousand === 1) {
    result = 'MIL';
  } else {
    result = convertHundreds(thousand) + ' MIL';
  }
  
  if (remainder > 0) {
    result += ' ' + convertHundreds(remainder);
  }
  
  return result;
}

function convertMillions(num: number): string {
  if (num < 1000000) {
    return convertThousands(num);
  }
  
  const million = Math.floor(num / 1000000);
  const remainder = num % 1000000;
  
  let result = '';
  if (million === 1) {
    result = 'UN MILLÓN';
  } else {
    result = convertHundreds(million) + ' MILLONES';
  }
  
  if (remainder > 0) {
    result += ' ' + convertThousands(remainder);
  }
  
  return result;
}

export function numberToWords(num: number): string {
  if (num === 0) return 'CERO PESOS 00/100 MXN';
  
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  let result = convertMillions(integerPart);
  
  // Add "PESOS" if there's an integer part
  if (integerPart > 0) {
    result += ' PESOS';
  }
  
  // Add decimal part
  result += ` ${decimalPart.toString().padStart(2, '0')}/100 MXN`;
  
  return `(${result})`;
}

