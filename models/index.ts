import { Schema, model, models, Document, Model, Types } from 'mongoose';

// Interfaces para TypeScript

/**
 * Interfaz para el certificado digital
 */
export interface ICertificadoDigital {
  data: Buffer;
  password: string;
  metadata?: {
    subject: string;
    issuer: string;
    validFrom: Date;
    validTo: Date;
  };
}

/**
 * Interfaz para la configuración
 */
export interface IConfiguracion extends Document {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionMatriz: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: boolean;
  ambiente: string; // '1' = pruebas, '2' = producción
  tipoEmision: string; // '1' = normal
  email: string;
  loyverseApiToken?: string;
  certificadoDigital?: ICertificadoDigital;
  certificadoId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaz para los mensajes del SRI
 */
export interface IMensajeSRI {
  identificador: string;
  mensaje: string;
  informacionAdicional?: string;
  tipo: string;
}

/**
 * Interfaz para la respuesta del SRI
 */
export interface ISRI {
  estado: string;
  fechaAutorizacion?: Date;
  numeroAutorizacion?: string;
  ambiente?: string;
  mensajes?: IMensajeSRI[];
}

/**
 * Interfaz para los impuestos
 */
export interface IImpuesto {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: number;
  baseImponible: number;
  valor: number;
}

/**
 * Interfaz para los detalles de la factura
 */
export interface IDetalle {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
  impuestos: IImpuesto[];
}

/**
 * Interfaz para la información adicional
 */
export interface IInfoAdicional {
  nombre: string;
  valor: string;
}

/**
 * Interfaz para la factura
 */
export interface IFactura extends Document {
  secuencial: string;
  fechaEmision: Date;
  dirEstablecimiento?: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: boolean;
  tipoIdentificacionComprador: string;
  razonSocialComprador: string;
  identificacionComprador: string;
  direccionComprador?: string;
  totalSinImpuestos: number;
  totalDescuento: number;
  totalConImpuestos: IImpuesto[];
  propina: number;
  importeTotal: number;
  moneda: string;
  formaPago: string[];
  infoAdicional?: IInfoAdicional[];
  detalles: IDetalle[];
  claveAcceso: string;
  xmlSinFirma?: string;
  xmlFirmado?: string;
  sri?: ISRI;
  createdAt: Date;
  updatedAt: Date;
}

// Esquemas de Mongoose

/**
 * Esquema para el certificado digital
 */
const CertificadoDigitalSchema = new Schema({
  data: Buffer,
  password: String,
  metadata: {
    subject: String,
    issuer: String,
    validFrom: Date,
    validTo: Date,
  },
});

/**
 * Esquema para la configuración
 */
const ConfiguracionSchema = new Schema(
  {
    ruc: {
      type: String,
      required: [true, 'El RUC es obligatorio'],
      trim: true,
      maxlength: [13, 'El RUC debe tener 13 caracteres'],
      minlength: [13, 'El RUC debe tener 13 caracteres'],
    },
    razonSocial: {
      type: String,
      required: [true, 'La razón social es obligatoria'],
      trim: true,
    },
    nombreComercial: {
      type: String,
      trim: true,
    },
    direccionMatriz: {
      type: String,
      required: [true, 'La dirección de matriz es obligatoria'],
      trim: true,
    },
    contribuyenteEspecial: {
      type: String,
      trim: true,
    },
    obligadoContabilidad: {
      type: Boolean,
      default: false,
    },
    ambiente: {
      type: String,
      enum: ['1', '2'],
      default: '1',
    },
    tipoEmision: {
      type: String,
      enum: ['1'],
      default: '1',
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      trim: true,
    },
    loyverseApiToken: {
      type: String,
      trim: true,
    },
    certificadoDigital: CertificadoDigitalSchema,
  },
  {
    timestamps: true,
  }
);

/**
 * Esquema para los mensajes del SRI
 */
const MensajeSRISchema = new Schema({
  identificador: String,
  mensaje: String,
  informacionAdicional: String,
  tipo: String,
});

/**
 * Esquema para la respuesta del SRI
 */
const SRISchema = new Schema({
  estado: {
    type: String,
    enum: [
      'RECIBIDA',
      'EN PROCESO',
      'AUTORIZADO',
      'NO AUTORIZADO',
      'DEVUELTA',
      'RECHAZADA',
    ],
    default: 'RECIBIDA',
  },
  fechaAutorizacion: Date,
  numeroAutorizacion: String,
  ambiente: String,
  mensajes: [MensajeSRISchema],
});

/**
 * Esquema para los impuestos
 */
const ImpuestoSchema = new Schema({
  codigo: String,
  codigoPorcentaje: String,
  tarifa: Number,
  baseImponible: Number,
  valor: Number,
});

/**
 * Esquema para los detalles de la factura
 */
const DetalleSchema = new Schema({
  codigoPrincipal: String,
  descripcion: String,
  cantidad: Number,
  precioUnitario: Number,
  descuento: Number,
  precioTotalSinImpuesto: Number,
  impuestos: [ImpuestoSchema],
});

/**
 * Esquema para la información adicional
 */
const InfoAdicionalSchema = new Schema({
  nombre: String,
  valor: String,
});

/**
 * Esquema para la factura
 */
const FacturaSchema = new Schema(
  {
    secuencial: {
      type: String,
      required: [true, 'El secuencial es obligatorio'],
      trim: true,
    },
    fechaEmision: {
      type: Date,
      required: [true, 'La fecha de emisión es obligatoria'],
      default: Date.now,
    },
    dirEstablecimiento: {
      type: String,
      trim: true,
    },
    contribuyenteEspecial: {
      type: String,
      trim: true,
    },
    obligadoContabilidad: {
      type: Boolean,
      default: false,
    },
    tipoIdentificacionComprador: {
      type: String,
      required: [true, 'El tipo de identificación del comprador es obligatorio'],
      trim: true,
    },
    razonSocialComprador: {
      type: String,
      required: [true, 'La razón social del comprador es obligatoria'],
      trim: true,
    },
    identificacionComprador: {
      type: String,
      required: [true, 'La identificación del comprador es obligatoria'],
      trim: true,
    },
    direccionComprador: {
      type: String,
      trim: true,
    },
    totalSinImpuestos: {
      type: Number,
      required: [true, 'El total sin impuestos es obligatorio'],
    },
    totalDescuento: {
      type: Number,
      default: 0,
    },
    totalConImpuestos: [ImpuestoSchema],
    propina: {
      type: Number,
      default: 0,
    },
    importeTotal: {
      type: Number,
      required: [true, 'El importe total es obligatorio'],
    },
    moneda: {
      type: String,
      default: 'DOLAR',
    },
    formaPago: {
      type: [String],
      required: [true, 'La forma de pago es obligatoria'],
    },
    infoAdicional: [InfoAdicionalSchema],
    detalles: {
      type: [DetalleSchema],
      required: [true, 'Los detalles son obligatorios'],
    },
    claveAcceso: {
      type: String,
      required: [true, 'La clave de acceso es obligatoria'],
      trim: true,
      index: true,
    },
    xmlSinFirma: String,
    xmlFirmado: String,
    sri: SRISchema,
  },
  {
    timestamps: true,
  }
);

// Índices para mejorar el rendimiento de las consultas
FacturaSchema.index({ fechaEmision: -1 });
FacturaSchema.index({ razonSocialComprador: 1 });
FacturaSchema.index({ identificacionComprador: 1 });
FacturaSchema.index({ 'sri.estado': 1 });

// Modelos
export const ConfiguracionModel: Model<IConfiguracion> =
  models.Configuracion || model<IConfiguracion>('Configuracion', ConfiguracionSchema);

export const FacturaModel: Model<IFactura> =
  models.Factura || model<IFactura>('Factura', FacturaSchema);

// Exportar el modelo de certificado digital
// Nota: Aunque no tiene su propia colección, lo exportamos para mantener consistencia en las importaciones
export const CertificadoModel = {
  schema: CertificadoDigitalSchema
};

// Exportar también con los nombres originales para mantener compatibilidad
export const Configuracion = ConfiguracionModel;
export const Factura = FacturaModel;
