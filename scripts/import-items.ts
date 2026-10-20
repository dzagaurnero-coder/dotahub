import fs from 'node:fs/promises';
import path from 'node:path';
import type { ItemQuality, ItemRarity } from '@prisma/client';
import { prisma } from '@/config/prisma';

interface RawImportedItem {
  external_def_id?: string;
  slug?: string;
  name: string;
  localized_name?: string;
  hero_slug?: string | null;
  hero_name?: string | null;
  rarity?: string;
  quality?: string;
  item_type?: string;
  image_url: string;
  description?: string | null;
  estimated_value_minor?: number | null;
}

const VALID_RARITIES = new Set<ItemRarity>([
  'common',
  'uncommon',
  'rare',
  'mythical',
  'legendary',
  'ancient',
  'immortal',
  'arcana',
]);

const VALID_QUALITIES = new Set<ItemQuality>([
  'standard',
  'inscribed',
  'exalted',
  'corrupted',
  'autographed',
  'infused',
  'genuine',
  'auspicious',
  'unusual',
  'heroic',
  'elder',
]);

const BUILTIN_EXTRA_ITEMS: RawImportedItem[] = [
  {
    external_def_id: 'def_2001',
    name: 'Swine of the Sunken Galley',
    localized_name: 'Swine of the Sunken Galley (Arcana)',
    hero_slug: null,
    hero_name: 'Techies',
    rarity: 'arcana',
    quality: 'exalted',
    item_type: 'bundle',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU0vB9aSV7ESeSoxNvsW1J6KRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    description: 'Корабельная пушка редкости Arcana с полным набором пиротехнических эффектов.',
    estimated_value_minor: 215000,
  },
  {
    external_def_id: 'def_2002',
    name: 'Sylvan Vedette',
    localized_name: 'Sylvan Vedette',
    hero_slug: null,
    hero_name: 'Windranger',
    rarity: 'immortal',
    quality: 'standard',
    item_type: 'back',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU4vBxaQk3cStu42c7WQV9nJRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    description: 'Наплечник лесного стража с птицей-фамильяром и эффектом Powershot.',
    estimated_value_minor: 175000,
  },
  {
    external_def_id: 'def_2003',
    name: 'Soul Diffuser',
    localized_name: 'Soul Diffuser',
    hero_slug: null,
    hero_name: 'Spectre',
    rarity: 'immortal',
    quality: 'inscribed',
    item_type: 'weapon',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU2rA9YCX3VeOixxIDbUk59NztovbupJAtm1szJcG8SvN3nx9fYwfOmZ77TwW8I6pEn3L2UoY6tigXk-kA9Z2_3J4eLMlhpnG-9j6Y/360fx360f',
    description: 'Эфирный клинок Spectre, меняющий визуальный эффект Desolate.',
    estimated_value_minor: 195000,
  },
];

function slugifyItemName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadItemsSource(customFilePath?: string): Promise<RawImportedItem[]> {
  if (!customFilePath) {
    return BUILTIN_EXTRA_ITEMS;
  }

  const resolvedPath = path.resolve(process.cwd(), customFilePath);
  const rawContent = await fs.readFile(resolvedPath, 'utf-8');
  const parsed = JSON.parse(rawContent) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('JSON-файл импорта должен содержать массив объектов предметов.');
  }
  return parsed as RawImportedItem[];
}

async function runImport() {
  const customFileArg = process.argv[2];
  console.log('📦 Запуск идемпотентного импорта предметов Dota 2...');

  const itemsToImport = await loadItemsSource(customFileArg);
  let upsertedCount = 0;

  for (const raw of itemsToImport) {
    const slug = (raw.slug || slugifyItemName(raw.name)).trim();
    if (!slug) continue;

    const rarityNormalized = (raw.rarity?.toLowerCase() ?? 'common') as ItemRarity;
    const rarity: ItemRarity = VALID_RARITIES.has(rarityNormalized)
      ? rarityNormalized
      : 'common';

    const qualityNormalized = (raw.quality?.toLowerCase() ?? 'standard') as ItemQuality;
    const quality: ItemQuality = VALID_QUALITIES.has(qualityNormalized)
      ? qualityNormalized
      : 'standard';

    let heroId: string | null = null;
    let heroName: string | null = raw.hero_name ?? null;

    if (raw.hero_slug) {
      const hero = await prisma.hero.findUnique({
        where: { slug: raw.hero_slug },
      });
      if (hero) {
        heroId = hero.id;
        heroName = hero.localized_name;
      }
    }

    await prisma.dotaItem.upsert({
      where: { slug },
      update: {
        external_def_id: raw.external_def_id ?? undefined,
        name: raw.name,
        localized_name: raw.localized_name || raw.name,
        hero_id: heroId,
        hero_slug: raw.hero_slug ?? null,
        hero_name: heroName,
        rarity,
        quality,
        item_type: raw.item_type || 'weapon',
        image_url: raw.image_url,
        description: raw.description ?? null,
        estimated_value_minor:
          typeof raw.estimated_value_minor === 'number'
            ? Math.round(raw.estimated_value_minor)
            : null,
        is_active: true,
      },
      create: {
        external_def_id: raw.external_def_id ?? null,
        slug,
        name: raw.name,
        localized_name: raw.localized_name || raw.name,
        hero_id: heroId,
        hero_slug: raw.hero_slug ?? null,
        hero_name: heroName,
        rarity,
        quality,
        item_type: raw.item_type || 'weapon',
        image_url: raw.image_url,
        description: raw.description ?? null,
        estimated_value_minor:
          typeof raw.estimated_value_minor === 'number'
            ? Math.round(raw.estimated_value_minor)
            : null,
        is_active: true,
      },
    });

    upsertedCount += 1;
  }

  console.log(`✅ Импорт завершён без дублей. Обработано предметов: ${upsertedCount}.`);
}

runImport()
  .catch((err) => {
    console.error('❌ Ошибка импорта каталога предметов Dota 2:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });