const { loadEnv, Modules, defineConfig } = require('@medusajs/utils');

loadEnv(process.env.NODE_ENV, process.cwd());

const ADMIN_CORS = process.env.ADMIN_CORS;
const AUTH_CORS = process.env.AUTH_CORS;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER?.toLowerCase();
const JWT_SECRET = process.env.JWT_SECRET;
const REDIS_URL = process.env.REDIS_URL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM;
const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.zoho.com';
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE !== 'false' : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || SMTP_FROM;
const SHOULD_DISABLE_ADMIN = process.env.MEDUSA_DISABLE_ADMIN === 'true';
const STORE_CORS = process.env.STORE_CORS;
const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const WORKER_MODE = process.env.MEDUSA_WORKER_MODE ?? 'shared';
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_BUCKET = process.env.MINIO_BUCKET;
const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST;
const MEILISEARCH_ADMIN_KEY = process.env.MEILISEARCH_ADMIN_KEY;

const normalizeUrl = (url) => {
  if (!url) {
    return undefined;
  }

  const trimmed = url.trim().replace(/\/$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const BACKEND_URL = normalizeUrl(
  process.env.BACKEND_PUBLIC_URL ??
  process.env.RAILWAY_PUBLIC_DOMAIN_VALUE ??
  process.env.RAILWAY_PUBLIC_DOMAIN
) ?? 'http://localhost:9000';

const notificationProviders = [];

if ((EMAIL_PROVIDER === 'resend' || !EMAIL_PROVIDER) && RESEND_API_KEY && RESEND_FROM_EMAIL) {
  notificationProviders.push({
    resolve: './src/modules/email-notifications',
    id: 'resend',
    options: {
      channels: ['email'],
      api_key: RESEND_API_KEY,
      from: RESEND_FROM_EMAIL,
    },
  });
} else if ((EMAIL_PROVIDER === 'smtp' || !EMAIL_PROVIDER) && SMTP_FROM && SMTP_USER && SMTP_PASS) {
  notificationProviders.push({
    resolve: '@perseidesjs/notification-nodemailer/providers/nodemailer',
    id: 'smtp',
    options: {
      channels: ['email'],
      from: SMTP_FROM,
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    },
  });
} else if ((EMAIL_PROVIDER === 'sendgrid' || !EMAIL_PROVIDER) && SENDGRID_API_KEY && SENDGRID_FROM_EMAIL) {
  notificationProviders.push({
    resolve: '@medusajs/notification-sendgrid',
    id: 'sendgrid',
    options: {
      channels: ['email'],
      api_key: SENDGRID_API_KEY,
      from: SENDGRID_FROM_EMAIL,
    },
  });
}

const medusaConfig = {
  projectConfig: {
    databaseUrl: DATABASE_URL,
    databaseLogging: false,
    redisUrl: REDIS_URL,
    workerMode: WORKER_MODE,
    http: {
      adminCors: ADMIN_CORS,
      authCors: AUTH_CORS,
      storeCors: STORE_CORS,
      jwtSecret: JWT_SECRET,
      cookieSecret: COOKIE_SECRET
    },
    build: {
      rollupOptions: {
        external: ["@medusajs/dashboard", "@medusajs/admin-shared"]
      }
    }
  },
  admin: {
    backendUrl: BACKEND_URL,
    disable: SHOULD_DISABLE_ADMIN,
  },
  modules: [
    {
      key: Modules.FILE,
      resolve: '@medusajs/file',
      options: {
        providers: [
          ...(MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY ? [{
            resolve: './src/modules/minio-file',
            id: 'minio',
            options: {
              endPoint: MINIO_ENDPOINT,
              accessKey: MINIO_ACCESS_KEY,
              secretKey: MINIO_SECRET_KEY,
              bucket: MINIO_BUCKET // Optional, default: medusa-media
            }
          }] : [{
            resolve: '@medusajs/file-local',
            id: 'local',
            options: {
              upload_dir: 'static',
              backend_url: `${BACKEND_URL}/static`
            }
          }])
        ]
      }
    },
    ...(REDIS_URL ? [{
      key: Modules.EVENT_BUS,
      resolve: '@medusajs/event-bus-redis',
      options: {
        redisUrl: REDIS_URL
      }
    },
    {
      key: Modules.WORKFLOW_ENGINE,
      resolve: '@medusajs/workflow-engine-redis',
      options: {
        redis: {
          url: REDIS_URL,
        }
      }
    }] : []),
    {
      key: Modules.NOTIFICATION,
      resolve: '@medusajs/notification',
      options: {
        providers: notificationProviders
      }
    },
    ...(STRIPE_API_KEY && STRIPE_WEBHOOK_SECRET ? [{
      key: Modules.PAYMENT,
      resolve: '@medusajs/payment',
      options: {
        providers: [
          {
            resolve: '@medusajs/payment-stripe',
            id: 'stripe',
            options: {
              apiKey: STRIPE_API_KEY,
              webhookSecret: STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    }] : [])
  ],
  plugins: [
  ...(MEILISEARCH_HOST && MEILISEARCH_ADMIN_KEY ? [{
      resolve: '@rokmohar/medusa-plugin-meilisearch',
      options: {
        config: {
          host: MEILISEARCH_HOST,
          apiKey: MEILISEARCH_ADMIN_KEY
        },
        settings: {
          products: {
            type: 'products',
            enabled: true,
            fields: ['id', 'title', 'description', 'handle', 'variant_sku', 'thumbnail'],
            indexSettings: {
              searchableAttributes: ['title', 'description', 'variant_sku'],
              displayedAttributes: ['id', 'handle', 'title', 'description', 'variant_sku', 'thumbnail'],
              filterableAttributes: ['id', 'handle'],
            },
            primaryKey: 'id',
          }
        }
      }
    }] : [])
  ]
};

module.exports = defineConfig(medusaConfig);
