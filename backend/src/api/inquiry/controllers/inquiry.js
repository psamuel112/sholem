'use strict';

/**
 * Inquiry controller.
 *
 * `create` is the only publicly exposed action. It ignores any client-supplied
 * `status`/`notes` so the sales pipeline can only be advanced from the admin
 * panel, and it never echoes the stored record back to the browser.
 */

const { createCoreController } = require('@strapi/strapi').factories;

/** Fields a website visitor is allowed to submit. */
const PUBLIC_FIELDS = [
  'name',
  'email',
  'phone',
  'subject',
  'message',
  'type',
  'budget',
  'preferredLocation',
];

const VALID_TYPES = ['general', 'property', 'service', 'property-request'];

const trim = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : undefined;

module.exports = createCoreController('api::inquiry.inquiry', ({ strapi }) => ({
  async create(ctx) {
    const body = ctx.request.body?.data ?? ctx.request.body ?? {};

    const data = {};
    for (const field of PUBLIC_FIELDS) {
      const value = trim(body[field], field === 'message' ? 5000 : 255);
      if (value) data[field] = value;
    }

    if (!data.name || !data.email || !data.message) {
      return ctx.badRequest('Name, email and message are required.');
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      return ctx.badRequest('Please provide a valid email address.');
    }
    if (!VALID_TYPES.includes(data.type)) {
      data.type = 'general';
    }

    // Relations are accepted by documentId but validated against real records.
    for (const [key, uid] of [
      ['property', 'api::property.property'],
      ['service', 'api::service.service'],
    ]) {
      const documentId = body[key];
      if (typeof documentId !== 'string' || !documentId) continue;
      const exists = await strapi.documents(uid).findOne({ documentId, fields: ['id'] });
      if (exists) data[key] = documentId;
    }

    data.status = 'new';
    data.source = trim(body.source, 60) || 'website';

    const inquiry = await strapi.documents('api::inquiry.inquiry').create({ data });

    await this.notify(inquiry, data);

    // Deliberately minimal response: no stored record, no internal fields.
    ctx.status = 201;
    return { data: { id: inquiry.documentId, ok: true } };
  },

  /**
   * Best-effort admin notification. A mail failure must never fail the
   * submission — the record is already safely stored.
   */
  async notify(inquiry, data) {
    const to = process.env.INQUIRY_NOTIFICATION_EMAIL;
    if (!to) return;

    const lines = [
      `Name:     ${data.name}`,
      `Email:    ${data.email}`,
      data.phone ? `Phone:    ${data.phone}` : null,
      `Type:     ${data.type}`,
      data.budget ? `Budget:   ${data.budget}` : null,
      data.preferredLocation ? `Location: ${data.preferredLocation}` : null,
      '',
      data.message,
    ].filter(Boolean);

    // The default sendmail provider can hang indefinitely on hosts without a
    // sendmail binary (e.g. Render's free tier), so bound the send with a
    // timeout. The record is already stored — email must never delay the reply.
    const send = () =>
      strapi.plugin('email').service('email').send({
        to,
        replyTo: data.email,
        subject: `[Sholem Properties] New ${data.type} inquiry from ${data.name}`,
        text: lines.join('\n'),
      });
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('email send timed out after 10s')), 10_000)
    );

    try {
      await Promise.race([send(), timeout]);
    } catch (error) {
      strapi.log.warn(`Inquiry ${inquiry.documentId} saved but email failed: ${error.message}`);
    }
  },
}));
