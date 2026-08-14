module.exports = ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          // Allow the admin panel to preview media served from S3/Cloudinary.
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:'],
          'frame-src': ["'self'", 'https://www.google.com', 'https://maps.google.com'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      // Sites allowed to call this API. The known deployment origins are
      // always allowed so the enquiry form keeps working even when
      // CORS_ORIGINS is missing or mistyped; the env var is purely additive.
      origin: [
        'http://localhost:3000',
        'https://sholem-properties.vercel.app',
        'https://tpi-homes.vercel.app',
        ...env.array('CORS_ORIGINS', []),
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      // Property galleries are image-heavy; raise the upload ceiling.
      formLimit: '10mb',
      jsonLimit: '10mb',
      textLimit: '10mb',
      formidable: { maxFileSize: 25 * 1024 * 1024 },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
