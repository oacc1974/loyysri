import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConfiguracionModel, FacturaModel } from '@/models';
import { consultarAutorizacion } from '@/services/sriService';

/**
 * POST /api/invoice/consult/[id]
 * Consulta el estado de una factura en el SRI
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
    
    // Obtener configuración
    const config = await ConfiguracionModel.findOne().lean();
    if (!config) {
      return NextResponse.json(
        { error: 'No se encontró configuración del sistema' },
        { status: 404 }
      );
    }
    
    // Consultar estado en el SRI
    const respuesta = await consultarAutorizacion(factura.claveAcceso, config.ambiente);
    
    // Actualizar estado de la factura
    factura.sri = respuesta;
    await factura.save();
    
    return NextResponse.json({
      success: true,
      message: 'Consulta realizada correctamente',
      sri: respuesta,
    });
  } catch (error) {
    console.error('Error al consultar factura:', error);
    return NextResponse.json(
      { error: 'Error al consultar la factura' },
      { status: 500 }
    );
  }
}
