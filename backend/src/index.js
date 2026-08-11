'use strict';

/**
 * Application lifecycle hooks.
 *
 * On boot we reconcile the Public role's permissions with the list below so a
 * fresh deployment serves content immediately, without an operator having to
 * click through Settings → Roles. Inquiries are intentionally create-only.
 */

/** action names granted to the Public (unauthenticated) role. */
const PUBLIC_PERMISSIONS = {
  'api::property.property': ['find', 'findOne'],
  'api::property-type.property-type': ['find', 'findOne'],
  'api::offer-type.offer-type': ['find', 'findOne'],
  'api::city.city': ['find', 'findOne'],
  'api::feature.feature': ['find', 'findOne'],
  'api::service.service': ['find', 'findOne'],
  'api::post.post': ['find', 'findOne'],
  'api::global.global': ['find'],
  'api::homepage.homepage': ['find'],
  'api::about-page.about-page': ['find'],
  'api::inquiry.inquiry': ['create'],
};

async function grantPublicPermissions(strapi) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn('Public role not found; skipping permission bootstrap.');
    return;
  }

  let granted = 0;
  for (const [uid, actions] of Object.entries(PUBLIC_PERMISSIONS)) {
    for (const action of actions) {
      const permission = `${uid}.${action}`;
      const existing = await strapi
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action: permission, role: publicRole.id } });

      if (existing) continue;

      await strapi.query('plugin::users-permissions.permission').create({
        data: { action: permission, role: publicRole.id },
      });
      granted += 1;
    }
  }

  if (granted > 0) {
    strapi.log.info(`Granted ${granted} public API permission(s).`);
  }
}

module.exports = {
  register(/* { strapi } */) {},

  async bootstrap({ strapi }) {
    try {
      await grantPublicPermissions(strapi);
    } catch (error) {
      // Never block startup on permission sync — log and let an admin fix it.
      strapi.log.error(`Public permission bootstrap failed: ${error.message}`);
    }
  },
};
