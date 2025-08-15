/**
 * Servicio para exportación de resultados a CSV y PDF
 */

import { createObjectCsvStringifier } from 'csv-writer';
import PDFDocument from 'pdfkit';
import { IFactura, IConfiguracion } from '@/models';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Genera un archivo CSV con los datos de las facturas
 * @param facturas Lista de facturas a exportar
 * @param config Configuración del emisor
 * @returns Buffer con el contenido del CSV
 */
export async function generarCSV(facturas: IFactura[], config: IConfiguracion): Promise<Buffer> {
  // Definir encabezados
  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'secuencial', title: 'Secuencial' },
      { id: 'fechaEmision', title: 'Fecha Emisión' },
      { id: 'claveAcceso', title: 'Clave Acceso' },
      { id: 'razonSocialComprador', title: 'Cliente' },
      { id: 'identificacionComprador', title: 'Identificación' },
      { id: 'importeTotal', title: 'Total' },
      { id: 'estado', title: 'Estado SRI' },
      { id: 'fechaAutorizacion', title: 'Fecha Autorización' },
      { id: 'numeroAutorizacion', title: 'Número Autorización' },
    ],
  });

  // Preparar datos
  const records = facturas.map(factura => ({
    secuencial: factura.secuencial,
    fechaEmision: formatearFecha(factura.fechaEmision),
    claveAcceso: factura.claveAcceso,
    razonSocialComprador: factura.razonSocialComprador,
    identificacionComprador: factura.identificacionComprador,
    importeTotal: factura.importeTotal.toFixed(2),
    estado: factura.sri.estado,
    fechaAutorizacion: factura.sri.fechaAutorizacion ? formatearFecha(factura.sri.fechaAutorizacion) : '',
    numeroAutorizacion: factura.sri.numeroAutorizacion || '',
  }));

  // Generar CSV
  const header = csvStringifier.getHeaderString();
  const content = csvStringifier.stringifyRecords(records);
  const csv = header + content;

  // Convertir a Buffer
  return Buffer.from(csv);
}

/**
 * Genera un archivo PDF con los datos de las facturas
 * @param facturas Lista de facturas a exportar
 * @param config Configuración del emisor
 * @returns Buffer con el contenido del PDF
 */
export async function generarPDF(facturas: IFactura[], config: IConfiguracion): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Crear documento PDF
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: 'Reporte de Facturas Electrónicas',
          Author: config.razonSocial,
          Subject: 'Facturas SRI',
        },
      });

      // Buffer para almacenar el PDF
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Encabezado
      doc.fontSize(18).text('Reporte de Facturas Electrónicas', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Empresa: ${config.razonSocial}`);
      doc.text(`RUC: ${config.ruc}`);
      doc.text(`Fecha de generación: ${formatearFecha(new Date().toISOString())}`);
      doc.moveDown();

      // Tabla de facturas
      const tableTop = 180;
      const tableHeaders = [
        'Secuencial',
        'Fecha',
        'Cliente',
        'Identificación',
        'Total',
        'Estado SRI',
      ];
      const tableColumnWidths = [80, 80, 120, 90, 60, 80];
      const tableWidth = tableColumnWidths.reduce((a, b) => a + b, 0);

      // Dibujar encabezado de tabla
      doc.font('Helvetica-Bold');
      let xPos = 50;
      tableHeaders.forEach((header, i) => {
        doc.text(header, xPos, tableTop, {
          width: tableColumnWidths[i],
          align: 'left',
        });
        xPos += tableColumnWidths[i];
      });

      // Línea después del encabezado
      doc.moveTo(50, tableTop + 20).lineTo(50 + tableWidth, tableTop + 20).stroke();
      doc.moveDown();

      // Dibujar filas de datos
      doc.font('Helvetica');
      let yPos = tableTop + 30;

      facturas.forEach((factura, index) => {
        // Verificar si necesitamos una nueva página
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
          
          // Repetir encabezado en nueva página
          doc.font('Helvetica-Bold');
          xPos = 50;
          tableHeaders.forEach((header, i) => {
            doc.text(header, xPos, yPos, {
              width: tableColumnWidths[i],
              align: 'left',
            });
            xPos += tableColumnWidths[i];
          });
          
          // Línea después del encabezado
          doc.moveTo(50, yPos + 20).lineTo(50 + tableWidth, yPos + 20).stroke();
          doc.font('Helvetica');
          yPos += 30;
        }

        // Dibujar fila
        xPos = 50;
        
        // Secuencial
        doc.text(factura.secuencial, xPos, yPos, {
          width: tableColumnWidths[0],
          align: 'left',
        });
        xPos += tableColumnWidths[0];
        
        // Fecha
        doc.text(formatearFecha(factura.fechaEmision), xPos, yPos, {
          width: tableColumnWidths[1],
          align: 'left',
        });
        xPos += tableColumnWidths[1];
        
        // Cliente (truncar si es muy largo)
        const clienteNombre = factura.razonSocialComprador.length > 20
          ? factura.razonSocialComprador.substring(0, 20) + '...'
          : factura.razonSocialComprador;
        doc.text(clienteNombre, xPos, yPos, {
          width: tableColumnWidths[2],
          align: 'left',
        });
        xPos += tableColumnWidths[2];
        
        // Identificación
        doc.text(factura.identificacionComprador, xPos, yPos, {
          width: tableColumnWidths[3],
          align: 'left',
        });
        xPos += tableColumnWidths[3];
        
        // Total
        doc.text('$' + factura.importeTotal.toFixed(2), xPos, yPos, {
          width: tableColumnWidths[4],
          align: 'right',
        });
        xPos += tableColumnWidths[4];
        
        // Estado SRI
        doc.text(factura.sri.estado, xPos, yPos, {
          width: tableColumnWidths[5],
          align: 'left',
        });

        // Línea después de cada fila (excepto la última)
        if (index < facturas.length - 1) {
          doc.moveTo(50, yPos + 20).lineTo(50 + tableWidth, yPos + 20).stroke('#EEEEEE');
        }

        yPos += 30;
      });

      // Pie de página
      doc.fontSize(10);
      doc.text(
        `Total de facturas: ${facturas.length}`,
        50,
        yPos + 10,
        { align: 'left' }
      );

      // Finalizar documento
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Formatea una fecha ISO a formato legible
 * @param fechaStr Fecha en formato ISO
 * @returns Fecha formateada
 */
function formatearFecha(fechaStr: string): string {
  try {
    return format(parseISO(fechaStr), 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (error) {
    return 'Fecha inválida';
  }
}
