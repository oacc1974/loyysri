import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConfiguracionModel, FacturaModel } from '@/models';
import { generarPDF } from '@/services/exportService';

/**
 * GET /api/export/pdf
 * Exporta facturas a PDF según filtros
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const busqueda = searchParams.get('busqueda') || '';
    const estado = searchParams.get('estado') || '';
    const fechaDesde = searchParams.get('fechaDesde') || '';
    const fechaHasta = searchParams.get('fechaHasta') || '';
    
    // Construir filtro
    const filtro: any = {};
    
    // Filtro por búsqueda (razonSocialComprador, identificacionComprador o claveAcceso)
    if (busqueda) {
      filtro.$or = [
        { razonSocialComprador: { $regex: busqueda, $options: 'i' } },
        { identificacionComprador: { $regex: busqueda, $options: 'i' } },
        { claveAcceso: { $regex: busqueda, $options: 'i' } },
      ];
    }
    
    // Filtro por estado SRI
    if (estado) {
      filtro['sri.estado'] = estado;
    }
    
    // Filtro por fecha
    if (fechaDesde || fechaHasta) {
      filtro.fechaEmision = {};
      
      if (fechaDesde) {
        filtro.fechaEmision.$gte = new Date(fechaDesde);
      }
      
      if (fechaHasta) {
        // Ajustar fecha hasta al final del día
        const fechaHastaObj = new Date(fechaHasta);
        fechaHastaObj.setHours(23, 59, 59, 999);
        filtro.fechaEmision.$lte = fechaHastaObj;
      }
    }
    
    // Obtener facturas (máximo 500 para exportación a PDF)
    const facturas = await FacturaModel.find(filtro)
      .sort({ fechaEmision: -1 })
      .limit(500)
      .lean();
    
    // Obtener configuración
    const config = await ConfiguracionModel.findOne().lean();
    if (!config) {
      return NextResponse.json(
        { error: 'No se encontró configuración del sistema' },
        { status: 404 }
      );
    }
    
    // Generar PDF
    const pdfBuffer = await generarPDF(facturas, config);
    
    // Generar nombre de archivo
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `facturas-sri-${fecha}.pdf`;
    
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
    console.error('Error al exportar a PDF:', error);
    return NextResponse.json(
      { error: 'Error al exportar facturas a PDF' },
      { status: 500 }
    );
  }
}
