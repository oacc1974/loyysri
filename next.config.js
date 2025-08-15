const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para despliegue en Render
  output: 'standalone',
  
  // Configuración para manejo de imágenes
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'production',
  },
  
  // Variables de entorno públicas
  env: {
    APP_NAME: 'Loyverse SRI Ecuador',
    APP_VERSION: '1.0.0',
  },
  
  // Configuración de seguridad y CORS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // Configuración de webpack para compatibilidad con PDFKit
  webpack: (config, { isServer }) => {
    // Configuración para PDFKit en el navegador
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: require.resolve('stream-browserify'),
        zlib: require.resolve('browserify-zlib'),
        util: require.resolve('util/'),
        crypto: require.resolve('crypto-browserify'),
        path: require.resolve('path-browserify'),
        assert: require.resolve('assert/'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
      };
      
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }

    // Configuración para manejar archivos binarios (certificados)
    config.module.rules.push({
      test: /\.(p12|pfx)$/,
      use: {
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'static/certificates/',
          publicPath: '/_next/static/certificates/',
        },
      },
    });

    return config;
  },
  
  // Configuración experimental para componentes del servidor
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'pdfkit'],
    esmExternals: 'loose',
  },
  
  // Configuración de compilación
  swcMinify: true,
  reactStrictMode: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
