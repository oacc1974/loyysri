import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { FacturaModel } from '@/models';

/**
 * GET /api/invoice/list
 * Lista las facturas con filtros y paginación
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
    const pagina = parseInt(searchParams.get('pagina') || '1');
    const porPagina = parseInt(searchParams.get('porPagina') || '10');
    
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
    
    // Contar total de facturas
    const total = await FacturaModel.countDocuments(filtro);
    
    // Obtener facturas paginadas
    const facturas = await FacturaModel.find(filtro)
      .sort({ fechaEmision: -1 }) // Ordenar por fecha descendente
      .skip((pagina - 1) * porPagina)
      .limit(porPagina)
      .lean();
    
    return NextResponse.json({
      facturas,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
    });
  } catch (error) {
    console.error('Error al listar facturas:', error);
    return NextResponse.json(
      { error: 'Error al listar las facturas' },
      { status: 500 }
    );
  }
}
