import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConfiguracionModel, FacturaModel, CertificadoModel } from '@/models';
import { generarXML } from '@/services/xmlGeneratorService';
import { firmarXML } from '@/services/xmlSignService';
import { reprocesarComprobante } from '@/services/sriService';

/**
 * POST /api/invoice/reprocess/[id]
 * Reprocesa una factura rechazada o no autorizada
 */
export async function POST(
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
    
    // Verificar si la factura ya está autorizada
    if (factura.sri.estado === 'AUTORIZADO') {
      return NextResponse.json(
        { error: 'La factura ya está autorizada' },
        { status: 400 }
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
    
    // Generar XML nuevamente
    const xml = generarXML(factura.toObject(), config);
    
    // Firmar XML
    const xmlFirmado = await firmarXML(
      xml,
      certificado.certificado,
      certificado.password
    );
    
    // Reprocesar en el SRI
    const respuesta = await reprocesarComprobante(xmlFirmado, config.ambiente);
    
    // Actualizar estado de la factura
    factura.sri = respuesta;
    await factura.save();
    
    return NextResponse.json({
      success: true,
      message: 'Factura reprocesada correctamente',
      sri: respuesta,
    });
  } catch (error) {
    console.error('Error al reprocesar factura:', error);
    return NextResponse.json(
      { error: 'Error al reprocesar la factura' },
      { status: 500 }
    );
  }
}
