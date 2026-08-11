'use strict';

/**
 * Inquiry routes.
 *
 * Only `create` is reachable over the public API. Reading, updating and
 * deleting inquiries stays inside the admin panel, so customer contact
 * details are never exposed through the content API.
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/inquiries',
      handler: 'inquiry.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
