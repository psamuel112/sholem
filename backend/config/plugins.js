const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedExecutableTypes = [
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

module.exports = ({ env }) => {
  // Hosts with an ephemeral filesystem (Render, Railway, Fly) lose locally
  // stored uploads on every redeploy, so switch to Cloudinary whenever
  // credentials are present and fall back to the local provider otherwise.
  const cloudinaryName = env('CLOUDINARY_NAME');
  const useCloudinary = Boolean(cloudinaryName);

  const uploadConfig = useCloudinary
    ? {
        provider: 'cloudinary',
        providerOptions: {
          cloud_name: cloudinaryName,
          api_key: env('CLOUDINARY_KEY'),
          api_secret: env('CLOUDINARY_SECRET'),
        },
        actionOptions: {
          upload: { folder: env('CLOUDINARY_FOLDER', 'tpi-homes') },
          uploadStream: { folder: env('CLOUDINARY_FOLDER', 'tpi-homes') },
          delete: {},
        },
      }
    : {};

  return {
    'users-permissions': {
      config: {
        jwtManagement: 'refresh',
        sessions: {
          httpOnly: true,
        },
      },
    },
    upload: {
      config: {
        ...uploadConfig,
        sizeLimit: env.int('UPLOAD_SIZE_LIMIT', 20 * 1024 * 1024),
        security: {
          allowedTypes: allowedMediaTypes,
          deniedTypes: deniedExecutableTypes,
        },
      },
    },
  };
};
