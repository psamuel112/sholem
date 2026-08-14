'use strict';

/**
 * Seeds the Strapi instance with the Sholem Properties content set.
 *
 * Idempotent: every record is matched on its slug (or the single-type itself),
 * so re-running updates in place rather than creating duplicates. Stale
 * entries (not present in the seed files) are removed so the database always
 * mirrors the seed set exactly.
 *
 * Usage:
 *   npm run seed              # seed content, download+attach images
 *   npm run seed -- --no-media   # skip image downloads (much faster)
 *   npm run seed -- --media-only # attach images to already-seeded content
 *
 * Media is fetched from the legacy site the first time only; already-uploaded
 * files are reused by name. Downloads run concurrently (bounded) because the
 * legacy host is slow to respond per request.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const DATA_FILE = path.join(__dirname, '..', 'data', 'seed-data.json');
const CONTENT_FILE = path.join(__dirname, '..', 'data', 'site-content.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
const SKIP_MEDIA = process.argv.includes('--no-media');
const MEDIA_ONLY = process.argv.includes('--media-only');

/**
 * Map original filename -> local upload record, read from a previous local
 * seed. Lets the seed upload already-downloaded images straight to the
 * configured provider instead of re-fetching them from the legacy site.
 */
function buildLocalIndex() {
  const dbPath = path.join(__dirname, '..', '.tmp', 'data.db');
  if (!fs.existsSync(dbPath)) return new Map();
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    const rows = db.prepare('SELECT name, url FROM files').all();
    db.close();
    const map = new Map();
    for (const row of rows) {
      if (row.name && row.url) map.set(row.name, { url: row.url });
    }
    return map;
  } catch (error) {
    console.warn(`  ! could not read local media index (${error.message})`);
    return new Map();
  }
}

const LOCAL_INDEX = buildLocalIndex();

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
    // Prefer the local copy of the image over a slow download from the
    // legacy site; fall back to the URL when no local file exists.
    let buffer = null;
    const local = LOCAL_INDEX.get(name);
    if (local) {
      const localPath = path.join(UPLOADS_DIR, path.basename(local.url));
      if (fs.existsSync(localPath)) {
        buffer = fs.readFileSync(localPath);
      }
    }
    if (!buffer) {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Sholem-Properties-Seed/1.0' },
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
    }

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

/** Run an async function over a list with bounded concurrency. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
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

/** Update a collection entry by slug if it exists (used by --media-only). */
async function updateOnly(strapi, uid, slug, data) {
  const [existing] = await strapi.documents(uid).findMany({
    filters: { slug },
    limit: 1,
    status: 'draft',
  });
  if (!existing) return null;
  return strapi.documents(uid).update({ documentId: existing.documentId, data, status: 'published' });
}

/** Update a single type if it exists (used by --media-only). */
async function updateOnlySingle(strapi, uid, data) {
  const existing = await strapi.documents(uid).findFirst({ status: 'draft' });
  if (!existing) return null;
  return strapi.documents(uid).update({ documentId: existing.documentId, data, status: 'published' });
}

/**
 * Delete collection entries whose slug is no longer part of the seed set.
 * Keeps the database in sync when content is removed from the seed files.
 * Never called on user-generated collections (e.g. inquiry).
 */
async function cleanup(strapi, uid, validSlugs) {
  const valid = new Set(validSlugs);
  const out = await strapi.documents(uid).findMany({
    fields: ['documentId', 'slug'],
    limit: 1000,
    status: 'draft', // matches every status, like the upsert lookups above
  });
  // Content types without draft-and-publish return a plain array.
  const entries = Array.isArray(out) ? out : out.results;

  let removed = 0;
  for (const entry of entries) {
    if (entry.slug && !valid.has(entry.slug)) {
      await strapi.documents(uid).delete({ documentId: entry.documentId });
      removed += 1;
    }
  }
  if (removed > 0) {
    strapi.log.info(`  removed ${removed} stale ${uid.split('.').pop()} entr${removed === 1 ? 'y' : 'ies'}`);
  }
  return removed;
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

  await cleanup(strapi, 'api::property-type.property-type', raw.propertyTypes.map((t) => t.slug));
  await cleanup(strapi, 'api::offer-type.offer-type', raw.offerTypes.map((t) => t.slug));
  await cleanup(strapi, 'api::feature.feature', raw.features.map((t) => t.slug));
  await cleanup(strapi, 'api::city.city', cityTerms.map((t) => t.slug));

  strapi.log.info(
    `  types=${propertyTypeIds.size} offers=${offerTypeIds.size} ` +
      `cities=${cityIds.size} features=${featureIds.size}`
  );

  strapi.log.info(`Seeding ${raw.properties.length} properties…`);
  const propertyIds = new Map();
  for (const [index, item] of raw.properties.entries()) {
    const mediaUrls = [item.featuredImage, ...(item.gallery || []).slice(0, 8)].filter(Boolean);
    const mediaIds = await mapLimit(mediaUrls, 8, (url) => importImage(strapi, url));
    const featuredImage = item.featuredImage ? (mediaIds[0] ?? null) : null;
    const gallery = (item.featuredImage ? mediaIds.slice(1) : mediaIds).filter(Boolean);

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
  await cleanup(strapi, 'api::property.property', raw.properties.map((p) => p.slug));

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
  await cleanup(strapi, 'api::service.service', content.services.map((s) => s.slug));

  strapi.log.info(`Seeding ${raw.posts.length} posts…`);
  for (const post of raw.posts) {
    const coverImage = await importImage(strapi, post.coverImage);
    await upsert(strapi, 'api::post.post', post.slug, {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || null,
      content: post.content || null,
      coverImage,
      author: 'Sholem Properties',
      seo: {
        metaTitle: post.title.slice(0, 70),
        metaDescription: (post.excerpt || '').slice(0, 200),
        shareImage: coverImage,
      },
      publishedAt: post.publishedAt || new Date().toISOString(),
    });
  }
  await cleanup(strapi, 'api::post.post', raw.posts.map((p) => p.slug));

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

/* ------------------------------------------------------------ media-only pass */

/**
 * Attach images to content that was seeded with --no-media. Only touches
 * image-bearing fields (plus the shareImage inside the seo component), so
 * existing text content is left untouched.
 */
async function seedMedia(strapi) {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));

  strapi.log.info('Media-only pass: attaching images to existing content…');

  const featuredCityNames = content.featuredCities.map((c) => c.name);
  const cityTerms = raw.cities.map((city) => {
    const override = content.featuredCities.find((c) => c.name === city.name);
    return { ...city, image: override?.image, featured: Boolean(override) };
  });
  let withImage = 0;
  for (const term of cityTerms) {
    const id = term.image ? await importImage(strapi, term.image) : null;
    if (!id) continue;
    await updateOnly(strapi, 'api::city.city', term.slug, {
      image: id,
      featured: Boolean(term.featured),
    });
    withImage += 1;
  }
  strapi.log.info(`  cities with images: ${withImage}`);

  strapi.log.info(`Seeding media for ${raw.properties.length} properties…`);
  for (const [index, item] of raw.properties.entries()) {
    const mediaUrls = [item.featuredImage, ...(item.gallery || []).slice(0, 8)].filter(Boolean);
    const mediaIds = await mapLimit(mediaUrls, 8, (url) => importImage(strapi, url));
    const featuredImage = item.featuredImage ? (mediaIds[0] ?? null) : null;
    const gallery = (item.featuredImage ? mediaIds.slice(1) : mediaIds).filter(Boolean);
    if (!featuredImage && gallery.length === 0) continue;
    await updateOnly(strapi, 'api::property.property', item.slug, {
      featuredImage,
      gallery,
      seo: {
        metaTitle: item.title.slice(0, 70),
        metaDescription: (item.metaDescription || item.excerpt || '').slice(0, 200),
        shareImage: featuredImage,
      },
    });
    if ((index + 1) % 10 === 0) {
      strapi.log.info(`  …${index + 1}/${raw.properties.length}`);
    }
  }

  strapi.log.info(`Seeding media for ${content.services.length} services…`);
  for (const service of content.services) {
    const image = await importImage(strapi, service.image);
    if (!image) continue;
    await updateOnly(strapi, 'api::service.service', service.slug, {
      image,
      seo: {
        metaTitle: service.title.slice(0, 70),
        metaDescription: (service.summary || '').slice(0, 200),
        shareImage: image,
      },
    });
  }

  strapi.log.info(`Seeding media for ${raw.posts.length} posts…`);
  for (const post of raw.posts) {
    const coverImage = await importImage(strapi, post.coverImage);
    if (!coverImage) continue;
    await updateOnly(strapi, 'api::post.post', post.slug, {
      coverImage,
      seo: {
        metaTitle: post.title.slice(0, 70),
        metaDescription: (post.excerpt || '').slice(0, 200),
        shareImage: coverImage,
      },
    });
  }

  strapi.log.info('Seeding global logo…');
  const logo = await importImage(strapi, content.global.logo);
  if (logo) {
    await updateOnlySingle(strapi, 'api::global.global', {
      logo,
      defaultSeo: { ...content.global.defaultSeo, shareImage: logo },
    });
  }

  strapi.log.info('Seeding homepage images…');
  const heroImage = await importImage(strapi, content.homepage.hero.backgroundImage);
  const ctaBackground = await importImage(strapi, content.homepage.ctaBackground);
  if (heroImage || ctaBackground) {
    await updateOnlySingle(strapi, 'api::homepage.homepage', {
      hero: { ...content.homepage.hero, backgroundImage: heroImage },
      ctaBackground,
    });
  }

  strapi.log.info('Seeding about image…');
  const aboutHero = await importImage(strapi, content.about.heroImage);
  if (aboutHero) {
    await updateOnlySingle(strapi, 'api::about-page.about-page', { heroImage: aboutHero });
  }

  strapi.log.info('Media pass complete.');
}

/* ------------------------------------------------------------------ bootstrap */

async function main() {
  if (MEDIA_ONLY && SKIP_MEDIA) {
    console.error('--media-only and --no-media are mutually exclusive.');
    process.exit(1);
  }

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'info';

  try {
    if (MEDIA_ONLY) {
      await seedMedia(app);
    } else {
      await seed(app);
    }
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  } finally {
    await app.destroy();
  }
}

main();
