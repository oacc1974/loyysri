/**
 * Servicio para la generación de XML según especificaciones SRI Ecuador
 */

import { IFactura, IConfiguracion } from '@/models';

/**
 * Genera la clave de acceso para una factura según especificaciones SRI
 * @param fecha Fecha de emisión en formato Date
 * @param secuencial Secuencial de la factura
 * @param ruc RUC del emisor
 * @param ambiente Ambiente SRI ('1' = pruebas, '2' = producción)
 * @param tipoEmision Tipo de emisión ('1' = normal)
 * @returns Clave de acceso de 49 dígitos
 */
export function generarClaveAcceso(
  fecha: Date,
  secuencial: string,
  ruc: string,
  ambiente: string,
  tipoEmision: string
): string {
  // Formato fecha: ddmmaaaa
  const fechaStr = fecha.toISOString().slice(0, 10).replace(/-/g, '').slice(2);
  
  // Tipo de comprobante: 01 para facturas
  const tipoComprobante = '01';
  
  // Código numérico: 8 dígitos aleatorios
  const codigoNumerico = Math.floor(10000000 + Math.random() * 90000000).toString();
  
  // Secuencial debe ser de 9 dígitos
  const secuencialPadded = secuencial.padStart(9, '0');
  
  // Concatenar todos los campos
  const claveBase = fechaStr + tipoComprobante + ruc + ambiente + secuencialPadded + codigoNumerico + tipoEmision;
  
  // Calcular dígito verificador (módulo 11)
  const digito = calcularDigitoVerificador(claveBase);
  
  // Clave de acceso completa
  return claveBase + digito;
}

/**
 * Calcula el dígito verificador para una clave de acceso según algoritmo módulo 11
 * @param claveBase Clave base sin dígito verificador
 * @returns Dígito verificador
 */
function calcularDigitoVerificador(claveBase: string): string {
  const factores = [2, 3, 4, 5, 6, 7];
  let suma = 0;
  
  // Multiplicar cada dígito por el factor correspondiente
  for (let i = 0; i < claveBase.length; i++) {
    const factor = factores[i % factores.length];
    suma += parseInt(claveBase[claveBase.length - 1 - i]) * factor;
  }
  
  // Calcular módulo 11
  const modulo = 11 - (suma % 11);
  
  // Si el resultado es 11, el dígito es 0
  // Si el resultado es 10, el dígito es 1
  // En otros casos, el dígito es el resultado
  if (modulo === 11) {
    return '0';
  } else if (modulo === 10) {
    return '1';
  } else {
    return modulo.toString();
  }
}

/**
 * Genera el XML para una factura según especificaciones SRI
 * @param factura Datos de la factura
 * @param config Configuración del emisor
 * @returns XML en formato string
 */
export function generarXML(factura: IFactura, config: IConfiguracion): string {
  // Formatear fecha: dd/MM/yyyy
  const fechaEmision = new Date(factura.fechaEmision).toISOString().slice(0, 10).split('-').reverse().join('/');
  
  // Construir XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<factura id="comprobante" version="1.0.0">\n';
  
  // Información tributaria
  xml += '  <infoTributaria>\n';
  xml += `    <ambiente>${config.ambiente}</ambiente>\n`;
  xml += `    <tipoEmision>${config.tipoEmision}</tipoEmision>\n`;
  xml += `    <razonSocial>${escapeXML(config.razonSocial)}</razonSocial>\n`;
  xml += `    <nombreComercial>${escapeXML(config.nombreComercial || config.razonSocial)}</nombreComercial>\n`;
  xml += `    <ruc>${config.ruc}</ruc>\n`;
  xml += `    <claveAcceso>${factura.claveAcceso}</claveAcceso>\n`;
  xml += '    <codDoc>01</codDoc>\n';
  xml += `    <estab>${factura.secuencial.slice(0, 3)}</estab>\n`;
  xml += `    <ptoEmi>${factura.secuencial.slice(3, 6)}</ptoEmi>\n`;
  xml += `    <secuencial>${factura.secuencial.slice(6)}</secuencial>\n`;
  xml += `    <dirMatriz>${escapeXML(config.direccionMatriz)}</dirMatriz>\n`;
  xml += '  </infoTributaria>\n';
  
  // Información de la factura
  xml += '  <infoFactura>\n';
  xml += `    <fechaEmision>${fechaEmision}</fechaEmision>\n`;
  
  if (factura.dirEstablecimiento) {
    xml += `    <dirEstablecimiento>${escapeXML(factura.dirEstablecimiento)}</dirEstablecimiento>\n`;
  }
  
  if (config.contribuyenteEspecial) {
    xml += `    <contribuyenteEspecial>${config.contribuyenteEspecial}</contribuyenteEspecial>\n`;
  }
  
  xml += `    <obligadoContabilidad>${config.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>\n`;
  xml += `    <tipoIdentificacionComprador>${factura.tipoIdentificacionComprador}</tipoIdentificacionComprador>\n`;
  xml += `    <razonSocialComprador>${escapeXML(factura.razonSocialComprador)}</razonSocialComprador>\n`;
  xml += `    <identificacionComprador>${factura.identificacionComprador}</identificacionComprador>\n`;
  
  if (factura.direccionComprador) {
    xml += `    <direccionComprador>${escapeXML(factura.direccionComprador)}</direccionComprador>\n`;
  }
  
  xml += `    <totalSinImpuestos>${factura.totalSinImpuestos.toFixed(2)}</totalSinImpuestos>\n`;
  xml += `    <totalDescuento>${factura.totalDescuento.toFixed(2)}</totalDescuento>\n`;
  
  // Total con impuestos
  xml += '    <totalConImpuestos>\n';
  
  factura.totalConImpuestos.forEach(impuesto => {
    xml += '      <totalImpuesto>\n';
    xml += `        <codigo>${impuesto.codigo}</codigo>\n`;
    xml += `        <codigoPorcentaje>${impuesto.codigoPorcentaje}</codigoPorcentaje>\n`;
    xml += `        <baseImponible>${impuesto.baseImponible.toFixed(2)}</baseImponible>\n`;
    xml += `        <valor>${impuesto.valor.toFixed(2)}</valor>\n`;
    xml += '      </totalImpuesto>\n';
  });
  
  xml += '    </totalConImpuestos>\n';
  xml += `    <propina>${factura.propina.toFixed(2)}</propina>\n`;
  xml += `    <importeTotal>${factura.importeTotal.toFixed(2)}</importeTotal>\n`;
  xml += `    <moneda>${factura.moneda}</moneda>\n`;
  
  // Pagos
  xml += '    <pagos>\n';
  factura.formaPago.forEach(formaPago => {
    xml += '      <pago>\n';
    xml += `        <formaPago>${formaPago}</formaPago>\n`;
    xml += `        <total>${factura.importeTotal.toFixed(2)}</total>\n`;
    xml += '      </pago>\n';
  });
  xml += '    </pagos>\n';
  
  xml += '  </infoFactura>\n';
  
  // Detalles
  xml += '  <detalles>\n';
  
  factura.detalles.forEach(detalle => {
    xml += '    <detalle>\n';
    xml += `      <codigoPrincipal>${escapeXML(detalle.codigoPrincipal)}</codigoPrincipal>\n`;
    xml += `      <descripcion>${escapeXML(detalle.descripcion)}</descripcion>\n`;
    xml += `      <cantidad>${detalle.cantidad.toFixed(2)}</cantidad>\n`;
    xml += `      <precioUnitario>${detalle.precioUnitario.toFixed(2)}</precioUnitario>\n`;
    xml += `      <descuento>${detalle.descuento.toFixed(2)}</descuento>\n`;
    xml += `      <precioTotalSinImpuesto>${detalle.precioTotalSinImpuesto.toFixed(2)}</precioTotalSinImpuesto>\n`;
    
    // Impuestos del detalle
    xml += '      <impuestos>\n';
    detalle.impuestos.forEach(impuesto => {
      xml += '        <impuesto>\n';
      xml += `          <codigo>${impuesto.codigo}</codigo>\n`;
      xml += `          <codigoPorcentaje>${impuesto.codigoPorcentaje}</codigoPorcentaje>\n`;
      xml += `          <tarifa>${impuesto.tarifa.toFixed(2)}</tarifa>\n`;
      xml += `          <baseImponible>${impuesto.baseImponible.toFixed(2)}</baseImponible>\n`;
      xml += `          <valor>${impuesto.valor.toFixed(2)}</valor>\n`;
      xml += '        </impuesto>\n';
    });
    xml += '      </impuestos>\n';
    
    xml += '    </detalle>\n';
  });
  
  xml += '  </detalles>\n';
  
  // Información adicional
  if (factura.infoAdicional && factura.infoAdicional.length > 0) {
    xml += '  <infoAdicional>\n';
    factura.infoAdicional.forEach(info => {
      xml += `    <campoAdicional nombre="${escapeXML(info.nombre)}">${escapeXML(info.valor)}</campoAdicional>\n`;
    });
    xml += '  </infoAdicional>\n';
  }
  
  xml += '</factura>';
  
  return xml;
}

/**
 * Escapa caracteres especiales para XML
 * @param text Texto a escapar
 * @returns Texto escapado
 */
function escapeXML(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
