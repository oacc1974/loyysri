'use client';

import { useState, useEffect } from 'react';

interface ConfiguracionForm {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionMatriz: string;
  contribuyenteEspecial: string;
  obligadoContabilidad: boolean;
  ambiente: string;
  tipoEmision: string;
  email: string;
  loyverseApiToken: string;
}

interface CertificadoInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
}

export default function ConfigPanel() {
  // Estado para el formulario
  const [formData, setFormData] = useState<ConfiguracionForm>({
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    direccionMatriz: '',
    contribuyenteEspecial: '',
    obligadoContabilidad: false,
    ambiente: '1', // 1 = pruebas, 2 = producción
    tipoEmision: '1', // 1 = normal
    email: '',
    loyverseApiToken: '',
  });

  // Estado para el certificado
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [certificadoPassword, setCertificadoPassword] = useState('');
  const [certificadoInfo, setCertificadoInfo] = useState<CertificadoInfo | null>(null);

  // Estado para mensajes
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Cargar configuración existente al iniciar
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          if (data.config) {
            setFormData({
              ruc: data.config.ruc || '',
              razonSocial: data.config.razonSocial || '',
              nombreComercial: data.config.nombreComercial || '',
              direccionMatriz: data.config.direccionMatriz || '',
              contribuyenteEspecial: data.config.contribuyenteEspecial || '',
              obligadoContabilidad: data.config.obligadoContabilidad || false,
              ambiente: data.config.ambiente || '1',
              tipoEmision: data.config.tipoEmision || '1',
              email: data.config.email || '',
              loyverseApiToken: data.config.loyverseApiToken || '',
            });

            // Si hay certificado, mostrar su información
            if (data.config.certificadoDigital?.metadata) {
              setCertificadoInfo({
                subject: data.config.certificadoDigital.metadata.subject || '',
                issuer: data.config.certificadoDigital.metadata.issuer || '',
                validFrom: new Date(data.config.certificadoDigital.metadata.validFrom).toLocaleDateString('es-EC'),
                validTo: new Date(data.config.certificadoDigital.metadata.validTo).toLocaleDateString('es-EC'),
              });
            }
          }
        }
      } catch (error) {
        console.error('Error al cargar la configuración:', error);
      }
    };

    fetchConfig();
  }, []);

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value,
    });
  };

  // Manejar cambios en el archivo de certificado
  const handleCertificadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCertificadoFile(e.target.files[0]);
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Crear FormData para enviar el archivo
      const formDataToSend = new FormData();
      
      // Agregar datos del formulario
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString());
      });
      
      // Agregar certificado si existe
      if (certificadoFile) {
        formDataToSend.append('certificado', certificadoFile);
        formDataToSend.append('certificadoPassword', certificadoPassword);
      }

      // Enviar datos al servidor
      const response = await fetch('/api/config', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
        
        // Actualizar información del certificado si se proporcionó uno nuevo
        if (data.certificadoInfo) {
          setCertificadoInfo({
            subject: data.certificadoInfo.subject || '',
            issuer: data.certificadoInfo.issuer || '',
            validFrom: new Date(data.certificadoInfo.validFrom).toLocaleDateString('es-EC'),
            validTo: new Date(data.certificadoInfo.validTo).toLocaleDateString('es-EC'),
          });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar la configuración' });
      }
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">Configuración del Sistema</h2>
      
      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-6`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-4">Datos de la Empresa</h3>
          </div>

          {/* RUC */}
          <div className="form-group">
            <label htmlFor="ruc" className="form-label">RUC *</label>
            <input
              type="text"
              id="ruc"
              name="ruc"
              className="form-input"
              value={formData.ruc}
              onChange={handleChange}
              required
              maxLength={13}
              minLength={13}
              pattern="[0-9]+"
            />
          </div>

          {/* Razón Social */}
          <div className="form-group">
            <label htmlFor="razonSocial" className="form-label">Razón Social *</label>
            <input
              type="text"
              id="razonSocial"
              name="razonSocial"
              className="form-input"
              value={formData.razonSocial}
              onChange={handleChange}
              required
            />
          </div>

          {/* Nombre Comercial */}
          <div className="form-group">
            <label htmlFor="nombreComercial" className="form-label">Nombre Comercial</label>
            <input
              type="text"
              id="nombreComercial"
              name="nombreComercial"
              className="form-input"
              value={formData.nombreComercial}
              onChange={handleChange}
            />
          </div>

          {/* Dirección Matriz */}
          <div className="form-group">
            <label htmlFor="direccionMatriz" className="form-label">Dirección Matriz *</label>
            <input
              type="text"
              id="direccionMatriz"
              name="direccionMatriz"
              className="form-input"
              value={formData.direccionMatriz}
              onChange={handleChange}
              required
            />
          </div>

          {/* Contribuyente Especial */}
          <div className="form-group">
            <label htmlFor="contribuyenteEspecial" className="form-label">Contribuyente Especial (No. Resolución)</label>
            <input
              type="text"
              id="contribuyenteEspecial"
              name="contribuyenteEspecial"
              className="form-input"
              value={formData.contribuyenteEspecial}
              onChange={handleChange}
            />
          </div>

          {/* Obligado a llevar contabilidad */}
          <div className="form-group">
            <label className="form-label flex items-center">
              <input
                type="checkbox"
                name="obligadoContabilidad"
                checked={formData.obligadoContabilidad}
                onChange={handleChange}
                className="mr-2"
              />
              Obligado a llevar contabilidad
            </label>
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-4 mt-4">Configuración SRI</h3>
          </div>

          {/* Ambiente */}
          <div className="form-group">
            <label htmlFor="ambiente" className="form-label">Ambiente *</label>
            <select
              id="ambiente"
              name="ambiente"
              className="form-input"
              value={formData.ambiente}
              onChange={handleChange}
              required
            >
              <option value="1">Pruebas</option>
              <option value="2">Producción</option>
            </select>
          </div>

          {/* Tipo de Emisión */}
          <div className="form-group">
            <label htmlFor="tipoEmision" className="form-label">Tipo de Emisión *</label>
            <select
              id="tipoEmision"
              name="tipoEmision"
              className="form-input"
              value={formData.tipoEmision}
              onChange={handleChange}
              required
            >
              <option value="1">Normal</option>
            </select>
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Loyverse API Token */}
          <div className="form-group">
            <label htmlFor="loyverseApiToken" className="form-label">Loyverse API Token</label>
            <input
              type="text"
              id="loyverseApiToken"
              name="loyverseApiToken"
              className="form-input"
              value={formData.loyverseApiToken}
              onChange={handleChange}
            />
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-4 mt-4">Certificado Digital</h3>
          </div>

          {/* Certificado Digital */}
          <div className="form-group">
            <label htmlFor="certificado" className="form-label">Certificado Digital (.p12/.pfx)</label>
            <input
              type="file"
              id="certificado"
              name="certificado"
              className="form-input"
              accept=".p12,.pfx"
              onChange={handleCertificadoChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Suba su certificado digital en formato .p12 o .pfx
            </p>
          </div>

          {/* Contraseña del Certificado */}
          <div className="form-group">
            <label htmlFor="certificadoPassword" className="form-label">Contraseña del Certificado</label>
            <input
              type="password"
              id="certificadoPassword"
              name="certificadoPassword"
              className="form-input"
              value={certificadoPassword}
              onChange={(e) => setCertificadoPassword(e.target.value)}
            />
          </div>

          {/* Información del Certificado */}
          {certificadoInfo && (
            <div className="col-span-2 mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Información del Certificado Actual</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Sujeto:</strong> {certificadoInfo.subject}</p>
                  <p><strong>Emisor:</strong> {certificadoInfo.issuer}</p>
                </div>
                <div>
                  <p><strong>Válido desde:</strong> {certificadoInfo.validFrom}</p>
                  <p><strong>Válido hasta:</strong> {certificadoInfo.validTo}</p>
                </div>
              </div>
            </div>
          )}

          <div className="col-span-2 mt-6">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
