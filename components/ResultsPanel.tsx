'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Factura {
  _id: string;
  secuencial: string;
  fechaEmision: string;
  razonSocialComprador: string;
  identificacionComprador: string;
  importeTotal: number;
  claveAcceso: string;
  sri: {
    estado: string;
    fechaAutorizacion?: string;
    numeroAutorizacion?: string;
  };
  createdAt: string;
}

interface Filtros {
  busqueda: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
  pagina: number;
  porPagina: number;
}

export default function ResultsPanel() {
  // Estado para las facturas
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [totalFacturas, setTotalFacturas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Estado para los filtros
  const [filtros, setFiltros] = useState<Filtros>({
    busqueda: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
    pagina: 1,
    porPagina: 10,
  });

  // Estado para acciones en curso
  const [accionesEnCurso, setAccionesEnCurso] = useState<Record<string, boolean>>({});

  // Cargar facturas al iniciar o cambiar filtros
  useEffect(() => {
    const cargarFacturas = async () => {
      setLoading(true);
      setError(null);

      try {
        // Construir query params
        const params = new URLSearchParams();
        if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
        if (filtros.estado) params.append('estado', filtros.estado);
        if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
        params.append('pagina', filtros.pagina.toString());
        params.append('porPagina', filtros.porPagina.toString());

        // Realizar la petición
        const response = await fetch(`/api/invoice/list?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar las facturas');
        }

        const data = await response.json();
        setFacturas(data.facturas);
        setTotalFacturas(data.total);
      } catch (err) {
        console.error('Error al cargar facturas:', err);
        setError('Error al cargar las facturas. Por favor, intente de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    cargarFacturas();
  }, [filtros]);

  // Manejar cambios en los filtros
  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value,
      // Resetear página al cambiar otros filtros
      ...(name !== 'pagina' ? { pagina: 1 } : {}),
    }));
  };

  // Manejar búsqueda
  const handleBusqueda = (e: React.FormEvent) => {
    e.preventDefault();
    // La búsqueda ya se maneja en el useEffect al cambiar filtros
  };

  // Manejar cambio de página
  const handleCambioPagina = (nuevaPagina: number) => {
    setFiltros(prev => ({
      ...prev,
      pagina: nuevaPagina,
    }));
  };

  // Exportar resultados
  const handleExportar = async (formato: 'csv' | 'pdf') => {
    try {
      setMensaje(null);
      
      // Construir query params para la exportación
      const params = new URLSearchParams();
      if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);

      // URL de exportación
      const url = `/api/export/${formato}?${params.toString()}`;
      
      // Abrir en nueva pestaña para descargar
      window.open(url, '_blank');
      
      setMensaje({
        tipo: 'success',
        texto: `Exportación a ${formato.toUpperCase()} iniciada. El archivo se descargará automáticamente.`,
      });
    } catch (err) {
      console.error(`Error al exportar a ${formato}:`, err);
      setMensaje({
        tipo: 'error',
        texto: `Error al exportar a ${formato}. Por favor, intente de nuevo.`,
      });
    }
  };

  // Consultar estado de factura en SRI
  const handleConsultar = async (id: string) => {
    try {
      setAccionesEnCurso(prev => ({ ...prev, [id]: true }));
      setMensaje(null);
      
      const response = await fetch(`/api/invoice/consult/${id}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Actualizar la factura en la lista
        setFacturas(prev => 
          prev.map(factura => 
            factura._id === id ? { ...factura, sri: data.sri } : factura
          )
        );
        
        setMensaje({
          tipo: 'success',
          texto: `Consulta realizada. Estado: ${data.sri.estado}`,
        });
      } else {
        throw new Error(data.error || 'Error al consultar la factura');
      }
    } catch (err) {
      console.error('Error al consultar factura:', err);
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al consultar la factura',
      });
    } finally {
      setAccionesEnCurso(prev => ({ ...prev, [id]: false }));
    }
  };

  // Reprocesar factura
  const handleReprocesar = async (id: string) => {
    try {
      setAccionesEnCurso(prev => ({ ...prev, [`reprocesar-${id}`]: true }));
      setMensaje(null);
      
      const response = await fetch(`/api/invoice/reprocess/${id}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Actualizar la factura en la lista
        setFacturas(prev => 
          prev.map(factura => 
            factura._id === id ? { ...factura, sri: data.sri } : factura
          )
        );
        
        setMensaje({
          tipo: 'success',
          texto: `Factura reprocesada. Estado: ${data.sri.estado}`,
        });
      } else {
        throw new Error(data.error || 'Error al reprocesar la factura');
      }
    } catch (err) {
      console.error('Error al reprocesar factura:', err);
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al reprocesar la factura',
      });
    } finally {
      setAccionesEnCurso(prev => ({ ...prev, [`reprocesar-${id}`]: false }));
    }
  };

  // Descargar XML o PDF
  const handleDescargar = (id: string, tipo: 'xml' | 'pdf') => {
    const url = `/api/invoice/${tipo}/${id}`;
    window.open(url, '_blank');
  };

  // Formatear fecha
  const formatearFecha = (fechaStr: string) => {
    try {
      return format(parseISO(fechaStr), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Calcular número de páginas
  const totalPaginas = Math.ceil(totalFacturas / filtros.porPagina);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">Historial de Facturas</h2>

      {/* Mensajes */}
      {mensaje && (
        <div className={`alert ${mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'} mb-6`}>
          {mensaje.texto}
        </div>
      )}

      {error && (
        <div className="alert alert-error mb-6">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        
        <form onSubmit={handleBusqueda} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="form-group">
            <label htmlFor="busqueda" className="form-label">Buscar por RUC/Nombre/Clave</label>
            <input
              type="text"
              id="busqueda"
              name="busqueda"
              className="form-input"
              value={filtros.busqueda}
              onChange={handleFiltroChange}
              placeholder="Ingrese término de búsqueda"
            />
          </div>

          {/* Estado */}
          <div className="form-group">
            <label htmlFor="estado" className="form-label">Estado SRI</label>
            <select
              id="estado"
              name="estado"
              className="form-input"
              value={filtros.estado}
              onChange={handleFiltroChange}
            >
              <option value="">Todos</option>
              <option value="AUTORIZADO">Autorizado</option>
              <option value="NO AUTORIZADO">No Autorizado</option>
              <option value="EN PROCESO">En Proceso</option>
              <option value="RECIBIDA">Recibida</option>
              <option value="DEVUELTA">Devuelta</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </div>

          {/* Fecha Desde */}
          <div className="form-group">
            <label htmlFor="fechaDesde" className="form-label">Fecha Desde</label>
            <input
              type="date"
              id="fechaDesde"
              name="fechaDesde"
              className="form-input"
              value={filtros.fechaDesde}
              onChange={handleFiltroChange}
            />
          </div>

          {/* Fecha Hasta */}
          <div className="form-group">
            <label htmlFor="fechaHasta" className="form-label">Fecha Hasta</label>
            <input
              type="date"
              id="fechaHasta"
              name="fechaHasta"
              className="form-input"
              value={filtros.fechaHasta}
              onChange={handleFiltroChange}
            />
          </div>

          {/* Botones de acción */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary">
              Buscar
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => handleExportar('csv')}
            >
              Exportar CSV
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => handleExportar('pdf')}
            >
              Exportar PDF
            </button>
          </div>
        </form>
      </div>

      {/* Tabla de resultados */}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Secuencial</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Identificación</th>
              <th>Total</th>
              <th>Estado SRI</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-4">Cargando...</td>
              </tr>
            ) : facturas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4">No se encontraron facturas</td>
              </tr>
            ) : (
              facturas.map((factura) => (
                <tr key={factura._id}>
                  <td>{factura.secuencial}</td>
                  <td>{formatearFecha(factura.fechaEmision)}</td>
                  <td>{factura.razonSocialComprador}</td>
                  <td>{factura.identificacionComprador}</td>
                  <td>${factura.importeTotal.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge status-${factura.sri.estado.toLowerCase().replace(' ', '-')}`}>
                      {factura.sri.estado}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn btn-secondary text-xs"
                        onClick={() => handleDescargar(factura._id, 'xml')}
                      >
                        XML
                      </button>
                      <button
                        className="btn btn-secondary text-xs"
                        onClick={() => handleDescargar(factura._id, 'pdf')}
                      >
                        PDF
                      </button>
                      <button
                        className="btn btn-secondary text-xs"
                        onClick={() => handleConsultar(factura._id)}
                        disabled={accionesEnCurso[factura._id]}
                      >
                        {accionesEnCurso[factura._id] ? 'Consultando...' : 'Consultar'}
                      </button>
                      {factura.sri.estado !== 'AUTORIZADO' && (
                        <button
                          className="btn btn-primary text-xs"
                          onClick={() => handleReprocesar(factura._id)}
                          disabled={accionesEnCurso[`reprocesar-${factura._id}`]}
                        >
                          {accionesEnCurso[`reprocesar-${factura._id}`] ? 'Procesando...' : 'Reprocesar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="pagination mt-6">
          <button
            className="pagination-item"
            onClick={() => handleCambioPagina(1)}
            disabled={filtros.pagina === 1}
          >
            &laquo;
          </button>
          
          <button
            className="pagination-item"
            onClick={() => handleCambioPagina(filtros.pagina - 1)}
            disabled={filtros.pagina === 1}
          >
            &lt;
          </button>
          
          <span className="pagination-item">
            Página {filtros.pagina} de {totalPaginas}
          </span>
          
          <button
            className="pagination-item"
            onClick={() => handleCambioPagina(filtros.pagina + 1)}
            disabled={filtros.pagina === totalPaginas}
          >
            &gt;
          </button>
          
          <button
            className="pagination-item"
            onClick={() => handleCambioPagina(totalPaginas)}
            disabled={filtros.pagina === totalPaginas}
          >
            &raquo;
          </button>
        </div>
      )}

      {/* Información de resultados */}
      <div className="mt-4 text-sm text-gray-600">
        Mostrando {facturas.length} de {totalFacturas} facturas
      </div>
    </div>
  );
}
