import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConfiguracionModel, CertificadoModel } from '@/models';
import { verificarCertificado } from '@/services/xmlSignService';

/**
 * GET /api/config
 * Obtiene la configuración actual
 */
export async function GET() {
  try {
    await connectToDatabase();
    
    // Buscar la configuración (siempre usamos la primera)
    const config = await ConfiguracionModel.findOne().lean();
    
    if (!config) {
      return NextResponse.json(
        { error: 'No se encontró configuración' },
        { status: 404 }
      );
    }
    
    // Buscar información del certificado si existe
    let certificadoInfo = null;
    if (config.certificadoId) {
      certificadoInfo = await CertificadoModel.findById(config.certificadoId)
        .select('subject issuer validFrom validTo')
        .lean();
    }
    
    // Devolver la configuración sin el certificado (por seguridad)
    const configResponse = {
      ...config,
      certificado: undefined,
      certificadoPassword: undefined,
      certificadoInfo,
    };
    
    return NextResponse.json(configResponse);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json(
      { error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/config
 * Guarda o actualiza la configuración
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    await connectToDatabase();
    
    // Extraer datos del formulario
    const ruc = formData.get('ruc') as string;
    const razonSocial = formData.get('razonSocial') as string;
    const nombreComercial = formData.get('nombreComercial') as string;
    const direccionMatriz = formData.get('direccionMatriz') as string;
    const contribuyenteEspecial = formData.get('contribuyenteEspecial') as string;
    const obligadoContabilidad = formData.get('obligadoContabilidad') === 'true';
    const ambiente = formData.get('ambiente') as string;
    const tipoEmision = formData.get('tipoEmision') as string;
    const loyverseApiToken = formData.get('loyverseApiToken') as string;
    const loyverseStoreId = formData.get('loyverseStoreId') as string;
    const certificadoPassword = formData.get('certificadoPassword') as string;
    
    // Validar campos requeridos
    if (!ruc || !razonSocial || !direccionMatriz || !ambiente || !tipoEmision) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    
    // Buscar configuración existente
    let config = await ConfiguracionModel.findOne();
    
    // Procesar certificado si se proporciona
    const certificadoFile = formData.get('certificado') as File;
    let certificadoId = config?.certificadoId;
    
    if (certificadoFile && certificadoFile.size > 0 && certificadoPassword) {
      try {
        // Leer el archivo del certificado
        const certificadoBuffer = Buffer.from(await certificadoFile.arrayBuffer());
        
        // Verificar el certificado
        const certificadoInfo = await verificarCertificado(certificadoBuffer, certificadoPassword);
        
        // Guardar el certificado en la base de datos
        const certificado = new CertificadoModel({
          certificado: certificadoBuffer,
          password: certificadoPassword, // En producción, esto debería cifrarse
          subject: certificadoInfo.subject,
          issuer: certificadoInfo.issuer,
          validFrom: certificadoInfo.validFrom,
          validTo: certificadoInfo.validTo,
        });
        
        await certificado.save();
        certificadoId = certificado._id;
      } catch (error) {
        console.error('Error al procesar certificado:', error);
        return NextResponse.json(
          { error: 'Error al procesar el certificado. Verifique el archivo y la contraseña.' },
          { status: 400 }
        );
      }
    }
    
    // Crear o actualizar la configuración
    const configData = {
      ruc,
      razonSocial,
      nombreComercial: nombreComercial || razonSocial,
      direccionMatriz,
      contribuyenteEspecial: contribuyenteEspecial || undefined,
      obligadoContabilidad,
      ambiente,
      tipoEmision,
      loyverseApiToken,
      loyverseStoreId,
      certificadoId,
    };
    
    if (config) {
      // Actualizar configuración existente
      await ConfiguracionModel.findByIdAndUpdate(config._id, configData);
    } else {
      // Crear nueva configuración
      config = new ConfiguracionModel(configData);
      await config.save();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Configuración guardada correctamente',
    });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    return NextResponse.json(
      { error: 'Error al guardar la configuración' },
      { status: 500 }
    );
  }
}
