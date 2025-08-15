import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConfiguracionModel, FacturaModel, CertificadoModel } from '@/models';
import { generarXML } from '@/services/xmlGeneratorService';
import { firmarXML } from '@/services/xmlSignService';

/**
 * GET /api/invoice/xml/[id]
 * Descarga el XML firmado de una factura
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await connectToDatabase();
    
    // Obtener la factura
    const factura = await FacturaModel.findById(id);
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
    
    // Verificar que exista un certificado
    if (!config.certificadoId) {
      return NextResponse.json(
        { error: 'No se ha configurado un certificado digital' },
        { status: 400 }
      );
    }
    
    // Obtener certificado
    const certificado = await CertificadoModel.findById(config.certificadoId);
    if (!certificado) {
      return NextResponse.json(
        { error: 'No se encontró el certificado digital' },
        { status: 404 }
      );
    }
    
    // Generar XML
    const xml = generarXML(factura.toObject(), config);
    
    // Firmar XML
    const xmlFirmado = await firmarXML(
      xml,
      certificado.data,
      certificado.password
    );
    
    // Generar nombre de archivo
    const filename = `factura-${factura.secuencial}.xml`;
    
    // Devolver respuesta con el XML
    return new NextResponse(xmlFirmado, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error al generar XML:', error);
    return NextResponse.json(
      { error: 'Error al generar el XML de la factura' },
      { status: 500 }
    );
  }
}
