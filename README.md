# Loyverse SRI Ecuador - Integración de Facturación Electrónica

Sistema de integración entre Loyverse POS y el Servicio de Rentas Internas (SRI) de Ecuador para la emisión, firma, autorización y gestión de comprobantes electrónicos.

## Características

- **Configuración del Sistema**: Gestión de datos de la empresa, certificado digital y parámetros de conexión.
- **Generación de Facturas de Prueba**: Creación y envío de facturas de prueba al SRI.
- **Historial y Gestión**: Visualización, filtrado y reprocesamiento de facturas.
- **Exportación**: Descarga de facturas en formato XML, PDF, y exportación masiva a CSV y PDF.
- **Integración con Loyverse**: Conexión con la API de Loyverse para obtener datos de ventas.
- **Firma Digital**: Soporte para certificados digitales (.p12/.pfx) para firma XAdES-BES.
- **Comunicación con SRI**: Envío y recepción de comprobantes mediante servicios web SOAP.

## Requisitos

- Node.js 18.x o superior
- MongoDB 4.x o superior
- Certificado digital válido emitido por una entidad certificadora autorizada por el SRI
- Cuenta en Loyverse con acceso a API

## Instalación

1. Clonar el repositorio:
   ```
   git clone https://github.com/su-usuario/loyverse-sri-ecuador.git
   cd loyverse-sri-ecuador
   ```

2. Instalar dependencias:
   ```
   npm install
   ```

3. Crear archivo `.env` basado en `.env.example`:
   ```
   cp .env.example .env
   ```

4. Configurar variables de entorno en el archivo `.env`:
   ```
   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/loyverse-sri
   
   # Loyverse API
   LOYVERSE_API_TOKEN=your_loyverse_api_token
   
   # SRI Endpoints
   SRI_RECEPCION_URL_PRUEBAS=https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
   SRI_RECEPCION_URL_PRODUCCION=https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
   SRI_AUTORIZACION_URL_PRUEBAS=https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
   SRI_AUTORIZACION_URL_PRODUCCION=https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
   
   # App Config
   NODE_ENV=development
   PORT=3000
   ```

5. Iniciar el servidor de desarrollo:
   ```
   npm run dev
   ```

## Uso

### Configuración Inicial

1. Acceder a la aplicación en `http://localhost:3000`
2. Ir a la pestaña "Configuración"
3. Completar los datos de la empresa
4. Subir el certificado digital (.p12/.pfx) e ingresar la contraseña
5. Configurar el token de API de Loyverse
6. Guardar la configuración

### Generación de Facturas de Prueba

1. Ir a la pestaña "Factura de Prueba"
2. Completar los datos del cliente y los detalles de la factura
3. Hacer clic en "Generar Factura"
4. Verificar el resultado de la autorización
5. Descargar XML o PDF si se desea

### Gestión de Facturas

1. Ir a la pestaña "Resultados"
2. Utilizar los filtros para buscar facturas específicas
3. Consultar el estado actual de una factura en el SRI
4. Reprocesar facturas rechazadas o no autorizadas
5. Descargar XML o PDF de facturas individuales
6. Exportar resultados a CSV o PDF

## Despliegue en Render

1. Crear una nueva aplicación web en Render
2. Conectar con el repositorio de GitHub
3. Configurar como tipo "Node"
4. Establecer comando de construcción: `npm install && npm run build`
5. Establecer comando de inicio: `npm start`
6. Configurar variables de entorno según `.env.example`
7. Desplegar la aplicación

## Estructura del Proyecto

```
loyverse-sri/
├── app/                    # Aplicación Next.js (App Router)
│   ├── api/                # API Routes
│   │   ├── config/         # Endpoints de configuración
│   │   ├── export/         # Endpoints de exportación
│   │   └── invoice/        # Endpoints de facturas
│   ├── globals.css         # Estilos globales
│   ├── layout.tsx          # Layout principal
│   └── page.tsx            # Página principal
├── components/             # Componentes React
│   ├── ConfigPanel.tsx     # Panel de configuración
│   ├── ResultsPanel.tsx    # Panel de resultados
│   └── TestInvoicePanel.tsx # Panel de factura de prueba
├── lib/                    # Utilidades y bibliotecas
│   └── mongodb.ts          # Conexión a MongoDB
├── models/                 # Modelos de datos
│   └── index.ts            # Esquemas e interfaces
├── services/               # Servicios
│   ├── exportService.ts    # Servicio de exportación
│   ├── sriService.ts       # Servicio de comunicación con SRI
│   ├── xmlGeneratorService.ts # Servicio de generación XML
│   └── xmlSignService.ts   # Servicio de firma digital
├── public/                 # Archivos estáticos
├── .env.example            # Ejemplo de variables de entorno
├── next.config.js          # Configuración de Next.js
├── package.json            # Dependencias y scripts
└── README.md               # Documentación
```

## Notas Importantes

- **Ambiente de Pruebas**: Por defecto, la aplicación está configurada para usar el ambiente de pruebas del SRI. Para producción, cambie el ambiente en la configuración.
- **Certificado Digital**: Para producción, debe utilizar un certificado digital válido emitido por una entidad certificadora autorizada por el SRI.
- **Firma Digital**: La implementación actual utiliza un simulador de firma digital. Para producción, reemplace el servicio de firma con una implementación real utilizando bibliotecas como node-xades.
- **Comunicación con SRI**: La implementación actual utiliza un simulador de comunicación con el SRI. Para producción, reemplace el servicio con una implementación real utilizando bibliotecas como soap.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - vea el archivo LICENSE para más detalles.

## Soporte

Para soporte técnico, contacte a [su-email@ejemplo.com](mailto:su-email@ejemplo.com).

---

Desarrollado por [Su Nombre/Empresa] para la integración de Loyverse POS con el SRI Ecuador.
