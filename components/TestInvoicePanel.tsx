'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';

interface FormData {
  tipoIdentificacionComprador: string;
  razonSocialComprador: string;
  identificacionComprador: string;
  direccionComprador: string;
  detalles: {
    codigoPrincipal: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    codigoImpuesto: string;
    tarifaImpuesto: number;
  }[];
  formaPago: string;
  infoAdicional: {
    nombre: string;
    valor: string;
  }[];
}

interface ConfigStatus {
  isReady: boolean;
  message: string;
}

interface InvoiceResult {
  success: boolean;
  message: string;
  claveAcceso?: string;
  estado?: string;
  autorizacion?: {
    estado: string;
    numeroAutorizacion?: string;
    fechaAutorizacion?: string;
    ambiente?: string;
    mensajes?: {
      identificador: string;
      mensaje: string;
      informacionAdicional?: string;
      tipo: string;
    }[];
  };
  xmlUrl?: string;
  pdfUrl?: string;
}

export default function TestInvoicePanel() {
  // Estado para el formulario
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      tipoIdentificacionComprador: '04',
      razonSocialComprador: '',
      identificacionComprador: '',
      direccionComprador: '',
      detalles: [
        {
          codigoPrincipal: '',
          descripcion: '',
          cantidad: 1,
          precioUnitario: 0,
          descuento: 0,
          codigoImpuesto: '2',
          tarifaImpuesto: 12,
        },
      ],
      formaPago: '01',
      infoAdicional: [
        {
          nombre: '',
          valor: '',
        },
      ],
    },
  });

  // Field arrays para detalles e información adicional
  const {
    fields: detallesFields,
    append: appendDetalle,
    remove: removeDetalle,
  } = useFieldArray({
    control,
    name: 'detalles',
  });

  const {
    fields: infoAdicionalFields,
    append: appendInfoAdicional,
    remove: removeInfoAdicional,
  } = useFieldArray({
    control,
    name: 'infoAdicional',
  });

  // Estados para el proceso
  const [configStatus, setConfigStatus] = useState<ConfigStatus>({
    isReady: false,
    message: 'Verificando configuración...',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvoiceResult | null>(null);

  // Verificar configuración al cargar
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          if (data.config && data.config.certificadoDigital) {
            setConfigStatus({
              isReady: true,
              message: 'Configuración lista',
            });
          } else {
            setConfigStatus({
              isReady: false,
              message: 'Debe completar la configuración y subir un certificado digital',
            });
          }
        } else {
          setConfigStatus({
            isReady: false,
            message: 'Error al verificar la configuración',
          });
        }
      } catch (error) {
        console.error('Error al verificar la configuración:', error);
        setConfigStatus({
          isReady: false,
          message: 'Error al verificar la configuración',
        });
      }
    };

    checkConfig();
  }, []);

  // Manejar envío del formulario
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setResult(null);

    try {
      // Calcular totales para cada detalle
      const detallesConTotales = data.detalles.map(detalle => {
        const precioTotalSinImpuesto = 
          detalle.cantidad * detalle.precioUnitario - detalle.descuento;
        
        const valorImpuesto = 
          (precioTotalSinImpuesto * detalle.tarifaImpuesto) / 100;
        
        return {
          ...detalle,
          precioTotalSinImpuesto,
          impuestos: [
            {
              codigo: detalle.codigoImpuesto,
              codigoPorcentaje: detalle.tarifaImpuesto === 12 ? '2' : '0',
              tarifa: detalle.tarifaImpuesto,
              baseImponible: precioTotalSinImpuesto,
              valor: valorImpuesto,
            },
          ],
        };
      });

      // Calcular totales de la factura
      const totalSinImpuestos = detallesConTotales.reduce(
        (sum, detalle) => sum + detalle.precioTotalSinImpuesto, 0
      );
      
      const totalDescuento = detallesConTotales.reduce(
        (sum, detalle) => sum + detalle.descuento, 0
      );
      
      // Agrupar impuestos por código y tarifa
      const impuestosMap = new Map();
      detallesConTotales.forEach(detalle => {
        detalle.impuestos.forEach(impuesto => {
          const key = `${impuesto.codigo}-${impuesto.codigoPorcentaje}`;
          if (impuestosMap.has(key)) {
            const existingImpuesto = impuestosMap.get(key);
            existingImpuesto.baseImponible += impuesto.baseImponible;
            existingImpuesto.valor += impuesto.valor;
          } else {
            impuestosMap.set(key, { ...impuesto });
          }
        });
      });
      
      const totalConImpuestos = Array.from(impuestosMap.values());
      
      const importeTotal = totalSinImpuestos + 
        totalConImpuestos.reduce((sum, impuesto) => sum + impuesto.valor, 0);

      // Filtrar información adicional vacía
      const infoAdicionalFiltrada = data.infoAdicional.filter(
        info => info.nombre.trim() !== '' && info.valor.trim() !== ''
      );

      // Preparar datos para enviar
      const invoiceData = {
        ...data,
        detalles: detallesConTotales,
        totalSinImpuestos,
        totalDescuento,
        totalConImpuestos,
        importeTotal,
        propina: 0,
        moneda: 'DOLAR',
        formaPago: [data.formaPago],
        infoAdicional: infoAdicionalFiltrada,
      };

      // Enviar datos al servidor
      const response = await fetch('/api/invoice/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const responseData = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: 'Factura generada correctamente',
          claveAcceso: responseData.claveAcceso,
          estado: responseData.sri?.estado,
          autorizacion: responseData.sri,
          xmlUrl: `/api/invoice/xml/${responseData._id}`,
          pdfUrl: `/api/invoice/pdf/${responseData._id}`,
        });
      } else {
        setResult({
          success: false,
          message: responseData.error || 'Error al generar la factura',
        });
      }
    } catch (error) {
      console.error('Error al generar la factura:', error);
      setResult({
        success: false,
        message: 'Error al generar la factura',
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para descargar archivos
  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">Generación de Factura de Prueba</h2>

      {/* Estado de la configuración */}
      <div className={`alert ${configStatus.isReady ? 'alert-success' : 'alert-warning'} mb-6`}>
        {configStatus.message}
      </div>

      {/* Resultado de la generación */}
      {result && (
        <div className={`alert ${result.success ? 'alert-success' : 'alert-error'} mb-6`}>
          <h3 className="font-bold mb-2">{result.success ? 'Factura Generada' : 'Error'}</h3>
          <p>{result.message}</p>
          
          {result.success && result.claveAcceso && (
            <div className="mt-4">
              <p><strong>Clave de Acceso:</strong> {result.claveAcceso}</p>
              <p><strong>Estado SRI:</strong> {result.estado || 'Pendiente'}</p>
              
              {result.autorizacion && (
                <div className="mt-2">
                  {result.autorizacion.numeroAutorizacion && (
                    <p><strong>Número de Autorización:</strong> {result.autorizacion.numeroAutorizacion}</p>
                  )}
                  {result.autorizacion.fechaAutorizacion && (
                    <p><strong>Fecha de Autorización:</strong> {new Date(result.autorizacion.fechaAutorizacion).toLocaleString('es-EC')}</p>
                  )}
                  {result.autorizacion.ambiente && (
                    <p><strong>Ambiente:</strong> {result.autorizacion.ambiente === '1' ? 'Pruebas' : 'Producción'}</p>
                  )}
                  
                  {result.autorizacion.mensajes && result.autorizacion.mensajes.length > 0 && (
                    <div className="mt-2">
                      <p><strong>Mensajes:</strong></p>
                      <ul className="list-disc pl-5">
                        {result.autorizacion.mensajes.map((mensaje, index) => (
                          <li key={index}>
                            <strong>{mensaje.identificador}:</strong> {mensaje.mensaje}
                            {mensaje.informacionAdicional && (
                              <p className="text-sm text-gray-600">{mensaje.informacionAdicional}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4 flex space-x-4">
                {result.xmlUrl && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleDownload(result.xmlUrl!)}
                  >
                    Descargar XML
                  </button>
                )}
                {result.pdfUrl && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleDownload(result.pdfUrl!)}
                  >
                    Descargar PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-4">Datos del Comprador</h3>
          </div>

          {/* Tipo de Identificación */}
          <div className="form-group">
            <label htmlFor="tipoIdentificacionComprador" className="form-label">Tipo de Identificación *</label>
            <select
              id="tipoIdentificacionComprador"
              className={`form-input ${errors.tipoIdentificacionComprador ? 'border-red-500' : ''}`}
              {...register('tipoIdentificacionComprador', { required: true })}
            >
              <option value="04">RUC</option>
              <option value="05">Cédula</option>
              <option value="06">Pasaporte</option>
              <option value="07">Consumidor Final</option>
              <option value="08">Identificación del Exterior</option>
            </select>
            {errors.tipoIdentificacionComprador && (
              <p className="form-error">Este campo es obligatorio</p>
            )}
          </div>

          {/* Identificación */}
          <div className="form-group">
            <label htmlFor="identificacionComprador" className="form-label">Identificación *</label>
            <input
              type="text"
              id="identificacionComprador"
              className={`form-input ${errors.identificacionComprador ? 'border-red-500' : ''}`}
              {...register('identificacionComprador', { required: true })}
            />
            {errors.identificacionComprador && (
              <p className="form-error">Este campo es obligatorio</p>
            )}
          </div>

          {/* Razón Social */}
          <div className="form-group">
            <label htmlFor="razonSocialComprador" className="form-label">Razón Social *</label>
            <input
              type="text"
              id="razonSocialComprador"
              className={`form-input ${errors.razonSocialComprador ? 'border-red-500' : ''}`}
              {...register('razonSocialComprador', { required: true })}
            />
            {errors.razonSocialComprador && (
              <p className="form-error">Este campo es obligatorio</p>
            )}
          </div>

          {/* Dirección */}
          <div className="form-group">
            <label htmlFor="direccionComprador" className="form-label">Dirección</label>
            <input
              type="text"
              id="direccionComprador"
              className="form-input"
              {...register('direccionComprador')}
            />
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-4 mt-4">Detalles de la Factura</h3>
          </div>

          {/* Detalles */}
          {detallesFields.map((field, index) => (
            <div key={field.id} className="col-span-2 p-4 border rounded-lg mb-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Detalle #{index + 1}</h4>
                {index > 0 && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeDetalle(index)}
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Código */}
                <div className="form-group">
                  <label className="form-label">Código *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.detalles?.[index]?.codigoPrincipal ? 'border-red-500' : ''}`}
                    {...register(`detalles.${index}.codigoPrincipal` as const, { required: true })}
                  />
                  {errors.detalles?.[index]?.codigoPrincipal && (
                    <p className="form-error">Este campo es obligatorio</p>
                  )}
                </div>

                {/* Descripción */}
                <div className="form-group">
                  <label className="form-label">Descripción *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.detalles?.[index]?.descripcion ? 'border-red-500' : ''}`}
                    {...register(`detalles.${index}.descripcion` as const, { required: true })}
                  />
                  {errors.detalles?.[index]?.descripcion && (
                    <p className="form-error">Este campo es obligatorio</p>
                  )}
                </div>

                {/* Cantidad */}
                <div className="form-group">
                  <label className="form-label">Cantidad *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={`form-input ${errors.detalles?.[index]?.cantidad ? 'border-red-500' : ''}`}
                    {...register(`detalles.${index}.cantidad` as const, { 
                      required: true,
                      valueAsNumber: true,
                      min: 0.01
                    })}
                  />
                  {errors.detalles?.[index]?.cantidad && (
                    <p className="form-error">Ingrese una cantidad válida</p>
                  )}
                </div>

                {/* Precio Unitario */}
                <div className="form-group">
                  <label className="form-label">Precio Unitario *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={`form-input ${errors.detalles?.[index]?.precioUnitario ? 'border-red-500' : ''}`}
                    {...register(`detalles.${index}.precioUnitario` as const, { 
                      required: true,
                      valueAsNumber: true,
                      min: 0.01
                    })}
                  />
                  {errors.detalles?.[index]?.precioUnitario && (
                    <p className="form-error">Ingrese un precio válido</p>
                  )}
                </div>

                {/* Descuento */}
                <div className="form-group">
                  <label className="form-label">Descuento</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    {...register(`detalles.${index}.descuento` as const, { 
                      valueAsNumber: true,
                      min: 0
                    })}
                  />
                </div>

                {/* Impuesto */}
                <div className="form-group">
                  <label className="form-label">Impuesto *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="form-input"
                      {...register(`detalles.${index}.codigoImpuesto` as const)}
                    >
                      <option value="2">IVA</option>
                      <option value="3">ICE</option>
                      <option value="5">IRBPNR</option>
                    </select>
                    <select
                      className="form-input"
                      {...register(`detalles.${index}.tarifaImpuesto` as const)}
                    >
                      <option value="12">12%</option>
                      <option value="0">0%</option>
                      <option value="8">8%</option>
                      <option value="14">14%</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="col-span-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => appendDetalle({
                codigoPrincipal: '',
                descripcion: '',
                cantidad: 1,
                precioUnitario: 0,
                descuento: 0,
                codigoImpuesto: '2',
                tarifaImpuesto: 12,
              })}
            >
              Agregar Detalle
            </button>
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-4 mt-4">Forma de Pago</h3>
          </div>

          {/* Forma de Pago */}
          <div className="form-group col-span-2">
            <label htmlFor="formaPago" className="form-label">Forma de Pago *</label>
            <select
              id="formaPago"
              className={`form-input ${errors.formaPago ? 'border-red-500' : ''}`}
              {...register('formaPago', { required: true })}
            >
              <option value="01">Sin utilización del sistema financiero</option>
              <option value="15">Compensación de deudas</option>
              <option value="16">Tarjeta de débito</option>
              <option value="17">Tarjeta de crédito</option>
              <option value="18">Tarjeta prepago</option>
              <option value="19">Tarjeta de dinero electrónico</option>
              <option value="20">Otros con utilización del sistema financiero</option>
              <option value="21">Endoso de títulos</option>
            </select>
            {errors.formaPago && (
              <p className="form-error">Este campo es obligatorio</p>
            )}
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-4 mt-4">Información Adicional</h3>
          </div>

          {/* Información Adicional */}
          {infoAdicionalFields.map((field, index) => (
            <div key={field.id} className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 items-end">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-input"
                  {...register(`infoAdicional.${index}.nombre` as const)}
                />
              </div>
              <div className="form-group flex items-end">
                <div className="flex-grow">
                  <label className="form-label">Valor</label>
                  <input
                    type="text"
                    className="form-input"
                    {...register(`infoAdicional.${index}.valor` as const)}
                  />
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    className="btn btn-danger ml-2"
                    onClick={() => removeInfoAdicional(index)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="col-span-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => appendInfoAdicional({ nombre: '', valor: '' })}
            >
              Agregar Información Adicional
            </button>
          </div>

          <div className="col-span-2 mt-6">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !configStatus.isReady}
            >
              {loading ? 'Generando...' : 'Generar Factura de Prueba'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
