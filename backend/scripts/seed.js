'use strict';

/**
 * Seeds the Strapi instance with the TPI Homes content set.
 *
 * Idempotent: every record is matched on its slug (or the single-type itself),
 * so re-running updates in place rather than creating duplicates.
 *
 * Usage:
 *   npm run seed              # seed content, download+attach images
 *   npm run seed -- --no-media   # skip image downloads (much faster)
 *
 * Media is fetched from the legacy site the first time only; already-uploaded
 * files are reused by name.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const DATA_FILE = path.join(__dirname, '..', 'data', 'seed-data.json');
const CONTENT_FILE = path.join(__dirname, '..', 'data', 'site-content.json');
const SKIP_MEDIA = process.argv.includes('--no-media');

/* --------------------------------------------------------------- media helper */

const uploadCache = new Map();

/**
 * Download a remote image and register it in Strapi's media library.
 * Returns the file id, or null when the download fails (seeding continues).
 */
async function importImage(strapi, url) {
  if (!url || SKIP_MEDIA) return null;
  if (uploadCache.has(url)) return uploadCache.get(url);

  const name = decodeURIComponent(path.basename(new URL(url).pathname));

  // Reuse an existing upload with the same name.
  const [existing] = await strapi.plugin('upload').service('upload').findMany({
    filters: { name },
    limit: 1,
  });
  if (existing) {
    uploadCache.set(url, existing.id);
    return existing.id;
  }

  let tmpPath;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TPI-Homes-Seed/1.0' },
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    tmpPath = path.join(os.tmpdir(), `tpi-seed-${Date.now()}-${name}`);
    fs.writeFileSync(tmpPath, buffer);

    const ext = path.extname(name).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    const [uploaded] = await strapi.plugin('upload').service('upload').upload({
      data: {},
      files: { filepath: tmpPath, originalFilename: name, mimetype: mime, size: buffer.length },
    });

    uploadCache.set(url, uploaded.id);
    return uploaded.id;
  } catch (error) {
    strapi.log.warn(`  ! image skipped (${name}): ${error.message}`);
    uploadCache.set(url, null);
    return null;
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
}

async function importImages(strapi, urls = []) {
  const ids = [];
  for (const url of urls) {
    const id = await importImage(strapi, url);
    if (id) ids.push(id);
  }
  return ids;
}

/* ------------------------------------------------------------ upsert helpers */

/** Create-or-update a collection entry keyed by slug. */
async function upsert(strapi, uid, slug, data) {
  const [existing] = await strapi.documents(uid).findMany({
    filters: { slug },
    limit: 1,
    status: 'draft',
  });

  if (existing) {
    return strapi.documents(uid).update({
      documentId: existing.documentId,
      data,
      status: 'published',
    });
  }

  return strapi.documents(uid).create({ data, status: 'published' });
}

/** Create-or-update a single type. */
async function upsertSingle(strapi, uid, data) {
  const existing = await strapi.documents(uid).findFirst({ status: 'draft' });
  if (existing) {
    return strapi.documents(uid).update({
      documentId: existing.documentId,
      data,
      status: 'published',
    });
  }
  return strapi.documents(uid).create({ data, status: 'published' });
}

/** Seed a taxonomy and return a name -> documentId lookup. */
async function seedTaxonomy(strapi, uid, terms, { withImage = false } = {}) {
  const byName = new Map();
  for (const term of terms) {
    const data = {
      name: term.name,
      slug: term.slug,
      description: term.description || null,
    };
    if (withImage && term.image) {
      const id = await importImage(strapi, term.image);
      if (id) data.image = id;
      data.featured = Boolean(term.featured);
    }
    const record = await upsert(strapi, uid, term.slug, data);
    byName.set(term.name, record.documentId);
  }
  return byName;
}

/* ------------------------------------------------------------------ main seed */

async function seed(strapi) {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));

  strapi.log.info('Seeding taxonomies…');
  const propertyTypeIds = await seedTaxonomy(
    strapi,
    'api::property-type.property-type',
    raw.propertyTypes
  );
  const offerTypeIds = await seedTaxonomy(strapi, 'api::offer-type.offer-type', raw.offerTypes);
  const featureIds = await seedTaxonomy(strapi, 'api::feature.feature', raw.features);

  // Cities get hero images + a "featured" flag for the Top Locations section.
  const featuredCityNames = content.featuredCities.map((c) => c.name);
  const cityTerms = raw.cities.map((city) => {
    const override = content.featuredCities.find((c) => c.name === city.name);
    return {
      ...city,
      description: override?.description || city.description,
      image: override?.image,
      featured: Boolean(override),
    };
  });
  const cityIds = await seedTaxonomy(strapi, 'api::city.city', cityTerms, { withImage: true });

  strapi.log.info(
    `  types=${propertyTypeIds.size} offers=${offerTypeIds.size} ` +
      `cities=${cityIds.size} features=${featureIds.size}`
  );

  strapi.log.info(`Seeding ${raw.properties.length} properties…`);
  const propertyIds = new Map();
  for (const [index, item] of raw.properties.entries()) {
    const featuredImage = await importImage(strapi, item.featuredImage);
    const gallery = await importImages(strapi, (item.gallery || []).slice(0, 8));

    const cities = (item.cities || []).map((n) => cityIds.get(n)).filter(Boolean);
    const record = await upsert(strapi, 'api::property.property', item.slug, {
      title: item.title,
      slug: item.slug,
      price: item.price ? String(item.price) : null,
      excerpt: item.excerpt || null,
      description: item.description || null,
      featuredImage,
      gallery,
      bedrooms: item.bedrooms ?? null,
      bathrooms: item.bathrooms ?? null,
      toilets: item.toilets ?? null,
      plotSize: item.plotSize || null,
      address: (item.cities || []).join(', ') || null,
      featured: index < 4, // the four newest listings drive the homepage
      landmarks: (item.features || []).map((value) => ({ label: 'Landmark', value })),
      propertyTypes: (item.propertyTypes || []).map((n) => propertyTypeIds.get(n)).filter(Boolean),
      offerTypes: (item.offerTypes || []).map((n) => offerTypeIds.get(n)).filter(Boolean),
      cities,
      seo: {
        metaTitle: item.title.slice(0, 70),
        metaDescription: (item.metaDescription || item.excerpt || '').slice(0, 200),
        shareImage: featuredImage,
      },
      publishedAt: item.publishedAt || new Date().toISOString(),
    });
    propertyIds.set(item.slug, record.documentId);

    if ((index + 1) % 10 === 0) {
      strapi.log.info(`  …${index + 1}/${raw.properties.length}`);
    }
  }

  strapi.log.info(`Seeding ${content.services.length} services…`);
  const serviceIds = new Map();
  for (const service of content.services) {
    const image = await importImage(strapi, service.image);
    const record = await upsert(strapi, 'api::service.service', service.slug, {
      ...service,
      image,
      highlights: service.highlights || [],
      cta: service.cta || null,
      seo: {
        metaTitle: service.title.slice(0, 70),
        metaDescription: (service.summary || '').slice(0, 200),
        shareImage: image,
      },
      publishedAt: new Date().toISOString(),
    });
    serviceIds.set(service.slug, record.documentId);
  }

  strapi.log.info(`Seeding ${raw.posts.length} posts…`);
  for (const post of raw.posts) {
    const coverImage = await importImage(strapi, post.coverImage);
    await upsert(strapi, 'api::post.post', post.slug, {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || null,
      content: post.content || null,
      coverImage,
      author: 'TPI Homes',
      seo: {
        metaTitle: post.title.slice(0, 70),
        metaDescription: (post.excerpt || '').slice(0, 200),
        shareImage: coverImage,
      },
      publishedAt: post.publishedAt || new Date().toISOString(),
    });
  }

  strapi.log.info('Seeding global settings…');
  const logo = await importImage(strapi, content.global.logo);
  await upsertSingle(strapi, 'api::global.global', {
    ...content.global,
    logo,
    defaultSeo: { ...content.global.defaultSeo, shareImage: logo },
  });

  strapi.log.info('Seeding homepage…');
  const heroImage = await importImage(strapi, content.homepage.hero.backgroundImage);
  const ctaBackground = await importImage(strapi, content.homepage.ctaBackground);
  await upsertSingle(strapi, 'api::homepage.homepage', {
    ...content.homepage,
    hero: { ...content.homepage.hero, backgroundImage: heroImage },
    ctaBackground,
    featuredProperties: raw.properties.slice(0, 4).map((p) => propertyIds.get(p.slug)).filter(Boolean),
    featuredServices: content.services
      .filter((s) => s.featured)
      .map((s) => serviceIds.get(s.slug))
      .filter(Boolean),
    featuredCities: featuredCityNames.map((n) => cityIds.get(n)).filter(Boolean),
    publishedAt: new Date().toISOString(),
  });

  strapi.log.info('Seeding about page…');
  const aboutHero = await importImage(strapi, content.about.heroImage);
  await upsertSingle(strapi, 'api::about-page.about-page', {
    ...content.about,
    heroImage: aboutHero,
    publishedAt: new Date().toISOString(),
  });

  strapi.log.info('Seed complete.');
}

/* ------------------------------------------------------------------ bootstrap */

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'info';

  try {
    await seed(app);
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  } finally {
    await app.destroy();
  }
}

main();
