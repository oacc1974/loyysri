import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConfiguracionModel, FacturaModel } from '@/models';
import PDFDocument from 'pdfkit';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * GET /api/invoice/pdf/[id]
 * Genera y descarga el PDF de una factura
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await connectToDatabase();
    
    // Obtener la factura
    const factura = await FacturaModel.findById(id).lean();
    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }
    
    // Obtener configuración
    const config = await ConfiguracionModel.findOne().lean();
    if (!config) {
      return NextResponse.json(
        { error: 'No se encontró configuración del sistema' },
        { status: 404 }
      );
    }
    
    // Generar PDF
    const pdfBuffer = await generarPDFFactura(factura, config);
    
    // Generar nombre de archivo
    const filename = `factura-${factura.secuencial}.pdf`;
    
    // Convertir Buffer a Uint8Array que es compatible con BodyInit
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Devolver respuesta con el PDF
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return NextResponse.json(
      { error: 'Error al generar el PDF de la factura' },
      { status: 500 }
    );
  }
}

/**
 * Genera un PDF para una factura individual
 * @param factura Datos de la factura
 * @param config Configuración del emisor
 * @returns Buffer con el contenido del PDF
 */
async function generarPDFFactura(factura: any, config: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Crear documento PDF
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: `Factura ${factura.secuencial}`,
          Author: config.razonSocial,
          Subject: 'Factura Electrónica SRI',
        },
      });

      // Buffer para almacenar el PDF
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Encabezado
      doc.fontSize(16).text(`${config.razonSocial}`, { align: 'center' });
      if (config.nombreComercial && config.nombreComercial !== config.razonSocial) {
        doc.fontSize(14).text(`${config.nombreComercial}`, { align: 'center' });
      }
      doc.moveDown(0.5);
      doc.fontSize(12).text(`RUC: ${config.ruc}`, { align: 'center' });
      doc.fontSize(12).text(`${config.direccionMatriz}`, { align: 'center' });
      
      if (config.contribuyenteEspecial) {
        doc.fontSize(10).text(`Contribuyente Especial Nro. ${config.contribuyenteEspecial}`, { align: 'center' });
      }
      
      doc.fontSize(10).text(`Obligado a llevar contabilidad: ${config.obligadoContabilidad ? 'SI' : 'NO'}`, { align: 'center' });
      
      // Línea divisoria
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Título del documento
      doc.fontSize(14).text('FACTURA ELECTRÓNICA', { align: 'center' });
      doc.moveDown();

      // Información de la factura
      doc.fontSize(10);
      doc.text(`No. ${factura.secuencial}`, { align: 'right' });
      doc.text(`Fecha Emisión: ${formatearFecha(factura.fechaEmision)}`, { align: 'right' });
      doc.text(`Ambiente: ${config.ambiente === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'}`, { align: 'right' });
      doc.text(`Clave Acceso: ${factura.claveAcceso}`, { align: 'right' });
      
      // Estado SRI
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(factura.sri.estado === 'AUTORIZADO' ? 'green' : 'red')
        .text(`Estado SRI: ${factura.sri.estado}`, { align: 'right' });
      doc.fillColor('black');
      
      if (factura.sri.numeroAutorizacion) {
        doc.fontSize(10).text(`No. Autorización: ${factura.sri.numeroAutorizacion}`, { align: 'right' });
      }
      
      if (factura.sri.fechaAutorizacion) {
        doc.text(`Fecha Autorización: ${formatearFecha(factura.sri.fechaAutorizacion)}`, { align: 'right' });
      }
      
      doc.moveDown();

      // Información del cliente
      doc.fontSize(12).text('Información del Cliente', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Razón Social: ${factura.razonSocialComprador}`);
      doc.text(`Identificación: ${factura.identificacionComprador}`);
      if (factura.direccionComprador) {
        doc.text(`Dirección: ${factura.direccionComprador}`);
      }
      
      doc.moveDown();

      // Tabla de detalles
      doc.fontSize(12).text('Detalles de la Factura', { underline: true });
      doc.moveDown(0.5);
      
      // Encabezados de tabla
      const tableTop = doc.y;
      const tableHeaders = ['Cant.', 'Descripción', 'P. Unit.', 'Dscto.', 'Total'];
      const tableColumnWidths = [50, 250, 70, 70, 70];
      
      doc.fontSize(10).font('Helvetica-Bold');
      let xPos = 50;
      tableHeaders.forEach((header, i) => {
        const align = i === 0 ? 'center' : (i === 1 ? 'left' : 'right');
        doc.text(header, xPos, tableTop, {
          width: tableColumnWidths[i],
          align,
        });
        xPos += tableColumnWidths[i];
      });
      
      // Línea después del encabezado
      doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();
      
      // Detalles
      doc.font('Helvetica');
      let yPos = tableTop + 30;
      
      factura.detalles.forEach((detalle: any, index: number) => {
        // Verificar si necesitamos una nueva página
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
          
          // Repetir encabezado en nueva página
          doc.fontSize(10).font('Helvetica-Bold');
          xPos = 50;
          tableHeaders.forEach((header, i) => {
            const align = i === 0 ? 'center' : (i === 1 ? 'left' : 'right');
            doc.text(header, xPos, yPos, {
              width: tableColumnWidths[i],
              align,
            });
            xPos += tableColumnWidths[i];
          });
          
          // Línea después del encabezado
          doc.moveTo(50, yPos + 20).lineTo(550, yPos + 20).stroke();
          doc.font('Helvetica');
          yPos += 30;
        }
        
        // Dibujar fila
        xPos = 50;
        
        // Cantidad
        doc.text(detalle.cantidad.toFixed(2), xPos, yPos, {
          width: tableColumnWidths[0],
          align: 'center',
        });
        xPos += tableColumnWidths[0];
        
        // Descripción
        doc.text(detalle.descripcion, xPos, yPos, {
          width: tableColumnWidths[1],
          align: 'left',
        });
        xPos += tableColumnWidths[1];
        
        // Precio unitario
        doc.text(detalle.precioUnitario.toFixed(2), xPos, yPos, {
          width: tableColumnWidths[2],
          align: 'right',
        });
        xPos += tableColumnWidths[2];
        
        // Descuento
        doc.text(detalle.descuento.toFixed(2), xPos, yPos, {
          width: tableColumnWidths[3],
          align: 'right',
        });
        xPos += tableColumnWidths[3];
        
        // Total
        doc.text(detalle.precioTotalSinImpuesto.toFixed(2), xPos, yPos, {
          width: tableColumnWidths[4],
          align: 'right',
        });
        
        yPos += 20;
      });
      
      // Línea después de los detalles
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 20;
      
      // Totales
      const totalesX = 380;
      const totalesWidth = 120;
      
      doc.text('Subtotal:', totalesX, yPos, { width: totalesWidth, align: 'right' });
      doc.text(factura.totalSinImpuestos.toFixed(2), 550, yPos, { align: 'right' });
      yPos += 20;
      
      doc.text('Descuento:', totalesX, yPos, { width: totalesWidth, align: 'right' });
      doc.text(factura.totalDescuento.toFixed(2), 550, yPos, { align: 'right' });
      yPos += 20;
      
      // Impuestos
      factura.totalConImpuestos.forEach((impuesto: any) => {
        let impuestoNombre = 'Impuesto';
        if (impuesto.codigo === '2') {
          impuestoNombre = 'IVA';
          if (impuesto.codigoPorcentaje === '0') {
            impuestoNombre += ' 0%';
          } else if (impuesto.codigoPorcentaje === '2') {
            impuestoNombre += ' 12%';
          } else if (impuesto.codigoPorcentaje === '3') {
            impuestoNombre += ' 14%';
          }
        }
        
        doc.text(`${impuestoNombre}:`, totalesX, yPos, { width: totalesWidth, align: 'right' });
        doc.text(impuesto.valor.toFixed(2), 550, yPos, { align: 'right' });
        yPos += 20;
      });
      
      // Propina
      if (factura.propina > 0) {
        doc.text('Propina:', totalesX, yPos, { width: totalesWidth, align: 'right' });
        doc.text(factura.propina.toFixed(2), 550, yPos, { align: 'right' });
        yPos += 20;
      }
      
      // Total
      doc.font('Helvetica-Bold');
      doc.text('VALOR TOTAL:', totalesX, yPos, { width: totalesWidth, align: 'right' });
      doc.text(factura.importeTotal.toFixed(2), 550, yPos, { align: 'right' });
      doc.font('Helvetica');
      
      // Información adicional
      if (factura.infoAdicional && factura.infoAdicional.length > 0) {
        doc.moveDown(2);
        doc.fontSize(12).text('Información Adicional', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        
        factura.infoAdicional.forEach((info: any) => {
          doc.text(`${info.nombre}: ${info.valor}`);
        });
      }
      
      // Pie de página
      const bottomY = 780;
      doc.fontSize(8);
      doc.text(
        'Documento generado electrónicamente a través del sistema Loyverse SRI',
        50,
        bottomY,
        { align: 'center', width: 500 }
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
