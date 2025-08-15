import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConfiguracionModel, CertificadoModel, FacturaModel } from '@/models';
import { generarClaveAcceso, generarXML } from '@/services/xmlGeneratorService';
import { firmarXML } from '@/services/xmlSignService';
import { enviarComprobante, consultarAutorizacion } from '@/services/sriService';

/**
 * POST /api/invoice/test
 * Genera una factura de prueba, la firma, la envía al SRI y consulta su autorización
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    await connectToDatabase();
    
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
    
    // Generar clave de acceso
    const fechaEmision = new Date();
    const claveAcceso = generarClaveAcceso(
      fechaEmision,
      data.secuencial,
      config.ruc,
      config.ambiente,
      config.tipoEmision
    );
    
    // Preparar datos de la factura
    const facturaData = {
      secuencial: data.secuencial,
      fechaEmision,
      claveAcceso,
      tipoIdentificacionComprador: data.tipoIdentificacionComprador,
      razonSocialComprador: data.razonSocialComprador,
      identificacionComprador: data.identificacionComprador,
      direccionComprador: data.direccionComprador,
      totalSinImpuestos: data.totalSinImpuestos,
      totalDescuento: data.totalDescuento,
      propina: data.propina || 0,
      importeTotal: data.importeTotal,
      moneda: 'DOLAR',
      formaPago: data.formaPago,
      totalConImpuestos: data.totalConImpuestos,
      detalles: data.detalles,
      infoAdicional: data.infoAdicional,
      sri: {
        estado: 'PENDIENTE'
      }
    };
    
    // Guardar factura en la base de datos
    const factura = new FacturaModel(facturaData);
    await factura.save();
    
    // Generar XML
    const xml = generarXML(factura.toObject(), config);
    
    // Firmar XML
    const xmlFirmado = await firmarXML(
      xml,
      certificado.data,
      certificado.password
    );
    
    // Enviar al SRI
    const respuestaEnvio = await enviarComprobante(xmlFirmado, config.ambiente);
    
    // Actualizar estado de la factura
    // Inicializar factura.sri si no existe
    if (!factura.sri) {
      factura.sri = {};
    }
    factura.sri.estado = respuestaEnvio.estado;
    factura.sri.mensajes = respuestaEnvio.mensajes;
    await factura.save();
    
    // Si el envío fue exitoso, consultar autorización
    let respuestaAutorizacion = null;
    if (respuestaEnvio.estado === 'RECIBIDA') {
      respuestaAutorizacion = await consultarAutorizacion(claveAcceso, config.ambiente);
      
      // Actualizar estado de autorización
      factura.sri = respuestaAutorizacion;
      await factura.save();
    }
    
    // Preparar respuesta
    const response = {
      success: true,
      message: 'Factura procesada correctamente',
      claveAcceso,
      estado: factura.sri?.estado || 'DESCONOCIDO',
      autorizacion: respuestaAutorizacion,
      xmlUrl: `/api/invoice/xml/${factura._id}`,
      pdfUrl: `/api/invoice/pdf/${factura._id}`,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error al procesar factura de prueba:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al procesar la factura de prueba',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
