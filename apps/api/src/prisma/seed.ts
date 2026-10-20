import type { CaseCategory, ItemQuality, ItemRarity } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { hashPassword } from '@/utils/crypto-session';

interface SeedHero {
  slug: string;
  name: string;
  localized_name: string;
  primary_attr: string;
}

interface SeedItem {
  external_def_id: string;
  slug: string;
  name: string;
  localized_name: string;
  hero_slug: string | null;
  rarity: ItemRarity;
  quality: ItemQuality;
  item_type: string;
  image_url: string;
  description: string;
  estimated_value_minor: number | null;
}

interface SeedCase {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  category: CaseCategory;
  price_minor: number;
  image_url: string;
  is_featured: boolean;
  sort_order: number;
  pool: Array<{ itemSlug: string; weight: number }>;
}

const SEED_HEROES: SeedHero[] = [
  { slug: 'pudge', name: 'npc_dota_hero_pudge', localized_name: 'Pudge', primary_attr: 'str' },
  { slug: 'juggernaut', name: 'npc_dota_hero_juggernaut', localized_name: 'Juggernaut', primary_attr: 'agi' },
  { slug: 'phantom-assassin', name: 'npc_dota_hero_phantom_assassin', localized_name: 'Phantom Assassin', primary_attr: 'agi' },
  { slug: 'invoker', name: 'npc_dota_hero_invoker', localized_name: 'Invoker', primary_attr: 'all' },
  { slug: 'shadow-fiend', name: 'npc_dota_hero_nevermore', localized_name: 'Shadow Fiend', primary_attr: 'agi' },
  { slug: 'crystal-maiden', name: 'npc_dota_hero_crystal_maiden', localized_name: 'Crystal Maiden', primary_attr: 'int' },
  { slug: 'rubick', name: 'npc_dota_hero_rubick', localized_name: 'Rubick', primary_attr: 'all' },
  { slug: 'anti-mage', name: 'npc_dota_hero_antimage', localized_name: 'Anti-Mage', primary_attr: 'agi' },
  { slug: 'faceless-void', name: 'npc_dota_hero_faceless_void', localized_name: 'Faceless Void', primary_attr: 'agi' },
  { slug: 'sven', name: 'npc_dota_hero_sven', localized_name: 'Sven', primary_attr: 'str' },
];

const SEED_ITEMS: SeedItem[] = [
  {
    external_def_id: 'def_1001',
    slug: 'dragonclaw-hook',
    name: 'Dragonclaw Hook',
    localized_name: 'Dragonclaw Hook',
    hero_slug: 'pudge',
    rarity: 'immortal',
    quality: 'standard',
    item_type: 'weapon',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcUivB9aSQPRVees2c6cQ0hwIgFot6maKgtr3P33dTxW6d24kY6KhfPxDLbUkmJE5Ytyj-yYo9it3FHg-kE4ZGGnJ4eLMlhpw4R97_c/360fx360f',
    description: 'Легендарный костяной крюк Pudge из когтя древнего дракона.',
    estimated_value_minor: 1450000,
  },
  {
    external_def_id: 'def_1002',
    slug: 'feast-of-abscession',
    name: 'Feast of Abscession',
    localized_name: 'Feast of Abscession (Arcana)',
    hero_slug: 'pudge',
    rarity: 'arcana',
    quality: 'exalted',
    item_type: 'back',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcUivB9aSQPAUuCq0vDAX1h1KRFpob6bJAtv3P33dTxW6d24kY6KhfPxDLfQhG5U5fp9g-7J4bP5iUazrl1rZ2CgIoKLMlhp57zC57Q/360fx360f',
    description: 'Предмет редкости Arcana для Pudge с уникальной анимацией Dismember.',
    estimated_value_minor: 285000,
  },
  {
    external_def_id: 'def_1003',
    slug: 'manifold-paradox',
    name: 'Manifold Paradox',
    localized_name: 'Manifold Paradox (Arcana)',
    hero_slug: 'phantom-assassin',
    rarity: 'arcana',
    quality: 'exalted',
    item_type: 'weapon',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcUorA5OA1jTSeSoxNvsW1J6KRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    description: 'Парные клинки редчайшей работы для Phantom Assassin, рассекающие ткань реальности.',
    estimated_value_minor: 295000,
  },
  {
    external_def_id: 'def_1004',
    slug: 'bladeform-legacy',
    name: 'Bladeform Legacy',
    localized_name: 'Bladeform Legacy (Arcana)',
    hero_slug: 'juggernaut',
    rarity: 'arcana',
    quality: 'exalted',
    item_type: 'head',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU8rA1YCX3VeOixxIDbUk59NztovbupJAtm1szJcG8SvN3nx9fYwfOmZ77TwW8I6pEn3L2UoY6tigXk-kA9Z2_3J4eLMlhpnG-9j6Y/360fx360f',
    description: 'Древняя маска Juggernaut, пробуждающая дух дракона островов масок.',
    estimated_value_minor: 279000,
  },
  {
    external_def_id: 'def_1005',
    slug: 'demon-eater',
    name: 'Demon Eater',
    localized_name: 'Demon Eater (Arcana)',
    hero_slug: 'shadow-fiend',
    rarity: 'arcana',
    quality: 'inscribed',
    item_type: 'head',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU2vBxaSV7EStu42c7WQV9nJRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    description: 'Пылающий облик Shadow Fiend с изменёнными эффектами койлов и Requiem of Souls.',
    estimated_value_minor: 265000,
  },
  {
    external_def_id: 'def_1006',
    slug: 'frost-avalanche',
    name: 'Frost Avalanche',
    localized_name: 'Frost Avalanche (Arcana)',
    hero_slug: 'crystal-maiden',
    rarity: 'arcana',
    quality: 'exalted',
    item_type: 'back',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU4vBxaQk3cStu42c7WQV9nJRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    description: 'Мантия ледяного ветра для Crystal Maiden в сопровождении щенка Авроры.',
    estimated_value_minor: 255000,
  },
  {
    external_def_id: 'def_1007',
    slug: 'magus-cypher',
    name: 'The Magus Cypher',
    localized_name: 'The Magus Cypher (Arcana)',
    hero_slug: 'rubick',
    rarity: 'arcana',
    quality: 'exalted',
    item_type: 'back',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU0vB9aSV7ESeSoxNvsW1J6KRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    description: 'Плащ Великого Мага с десятками уникальных цветовых эффектов украденных способностей.',
    estimated_value_minor: 290000,
  },
  {
    external_def_id: 'def_1008',
    slug: 'dark-artistry-cape',
    name: 'Dark Artistry Cape',
    localized_name: 'Dark Artistry Cape',
    hero_slug: 'invoker',
    rarity: 'immortal',
    quality: 'inscribed',
    item_type: 'back',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU2rA9YCX3VeOixxIDbUk59NztovbupJAtm1szJcG8SvN3nx9fYwfOmZ77TwW8I6pEn3L2UoY6tigXk-kA9Z2_3J4eLMlhpnG-9j6Y/360fx360f',
    description: 'Редчайший плащ Invoker с кастомными эффектами Tornado и Deafening Blast.',
    estimated_value_minor: 890000,
  },
  {
    external_def_id: 'def_1009',
    slug: 'mace-of-aeons',
    name: 'Mace of Aeons',
    localized_name: 'Mace of Aeons',
    hero_slug: 'faceless-void',
    rarity: 'immortal',
    quality: 'standard',
    item_type: 'weapon',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcUivB9aSQPRVees2c6cQ0hwIgFot6maKgtr3P33dTxW6d24kY6KhfPxDLbUkmJE5Ytyj-yYo9it3FHg-kE4ZGGnJ4eLMlhpw4R97_c/360fx360f',
    description: 'Эпохальная булава Faceless Void, меняющая визуальную сферу Chronosphere на золотую.',
    estimated_value_minor: 1850000,
  },
  {
    external_def_id: 'def_1010',
    slug: 'vigil-triumph',
    name: 'Vigil Triumph',
    localized_name: 'Vigil Triumph',
    hero_slug: 'sven',
    rarity: 'immortal',
    quality: 'inscribed',
    item_type: 'weapon',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU8rA1YCX3VeOixxIDbUk59NztovbupJAtm1szJcG8SvN3nx9fYwfOmZ77TwW8I6pEn3L2UoY6tigXk-kA9Z2_3J4eLMlhpnG-9j6Y/360fx360f',
    description: 'Двуручный клинок рыцарей Вигильского ордена для Sven с эффектом God Strength.',
    estimated_value_minor: 520000,
  },
  {
    external_def_id: 'def_1011',
    slug: 'golden-basher-blades',
    name: 'Golden Basher Blades',
    localized_name: 'Golden Basher Blades',
    hero_slug: 'anti-mage',
    rarity: 'immortal',
    quality: 'standard',
    item_type: 'weapon',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcUorA5OA1jTSeSoxNvsW1J6KRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    description: 'Парные золотые клинки Skull Basher для Anti-Mage с золотой анимацией Mana Void.',
    estimated_value_minor: 165000,
  },
  {
    external_def_id: 'def_1012',
    slug: 'serrakura',
    name: 'Serrakura',
    localized_name: 'Serrakura',
    hero_slug: 'juggernaut',
    rarity: 'immortal',
    quality: 'inscribed',
    item_type: 'weapon',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU8rA1YCX3VeOixxIDbUk59NztovbupJAtm1szJcG8SvN3nx9fYwfOmZ77TwW8I6pEn3L2UoY6tigXk-kA9Z2_3J4eLMlhpnG-9j6Y/360fx360f',
    description: 'Клинок цветущей сакуры для Juggernaut с розовым эффектом Omnislash.',
    estimated_value_minor: 98000,
  },
  {
    external_def_id: 'def_1013',
    slug: 'codicil-of-the-veiled-ones',
    name: 'Codicil of the Veiled Ones',
    localized_name: 'Codicil of the Veiled Ones',
    hero_slug: 'phantom-assassin',
    rarity: 'immortal',
    quality: 'standard',
    item_type: 'head',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcUorA5OA1jTSeSoxNvsW1J6KRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    description: 'Шлем сестринства Вуали для Phantom Assassin с изменённым Stifling Dagger.',
    estimated_value_minor: 82000,
  },
  {
    external_def_id: 'def_1014',
    slug: 'screeauk-talon',
    name: "Scree'Auk's Talon",
    localized_name: "Scree'Auk's Talon",
    hero_slug: null,
    rarity: 'legendary',
    quality: 'auspicious',
    item_type: 'weapon',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU4vBxaQk3cStu42c7WQV9nJRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    description: 'Легендарный коготь богини ScreeAuk с кастомной волной магии.',
    estimated_value_minor: 45000,
  },
  {
    external_def_id: 'def_1015',
    slug: 'odachi-fireborn',
    name: 'Fireborn Odachi',
    localized_name: 'Fireborn Odachi',
    hero_slug: 'juggernaut',
    rarity: 'mythical',
    quality: 'inscribed',
    item_type: 'weapon',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU8rA1YCX3VeOixxIDbUk59NztovbupJAtm1szJcG8SvN3nx9fYwfOmZ77TwW8I6pEn3L2UoY6tigXk-kA9Z2_3J4eLMlhpnG-9j6Y/360fx360f',
    description: 'Мифический огненный меч для Juggernaut с кинетическим самоцветом.',
    estimated_value_minor: 28000,
  },
  {
    external_def_id: 'def_1016',
    slug: 'bloodstained-britches',
    name: 'Bloodstained Britches',
    localized_name: 'Bloodstained Britches',
    hero_slug: 'pudge',
    rarity: 'rare',
    quality: 'corrupted',
    item_type: 'armor',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcUivB9aSQPAUuCq0vDAX1h1KRFpob6bJAtv3P33dTxW6d24kY6KhfPxDLfQhG5U5fp9g-7J4bP5iUazrl1rZ2CgIoKLMlhp57zC57Q/360fx360f',
    description: 'Классический предмет экипировки мясника Pudge.',
    estimated_value_minor: 14000,
  },
  {
    external_def_id: 'def_1017',
    slug: 'bracers-of-the-cavern-luminar',
    name: 'Bracers of the Cavern Luminar',
    localized_name: 'Bracers of the Cavern Luminar',
    hero_slug: 'invoker',
    rarity: 'uncommon',
    quality: 'standard',
    item_type: 'arms',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU2rA9YCX3VeOixxIDbUk59NztovbupJAtm1szJcG8SvN3nx9fYwfOmZ77TwW8I6pEn3L2UoY6tigXk-kA9Z2_3J4eLMlhpnG-9j6Y/360fx360f',
    description: 'Боевые наручи чародея из глубин светящихся пещер.',
    estimated_value_minor: 6500,
  },
  {
    external_def_id: 'def_1018',
    slug: 'iron-bear-skullcap',
    name: 'Iron Bear Skullcap',
    localized_name: 'Iron Bear Skullcap',
    hero_slug: null,
    rarity: 'common',
    quality: 'standard',
    item_type: 'head',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU0vB9aSV7ESeSoxNvsW1J6KRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    description: 'Базовый железный наголовник северного воина.',
    estimated_value_minor: 3500,
  },
  {
    external_def_id: 'def_1019',
    slug: 'aegis-collector-emblem-unpriced',
    name: 'Collector Aegis Relic',
    localized_name: 'Collector Aegis Relic (Архивный)',
    hero_slug: null,
    rarity: 'ancient',
    quality: 'heroic',
    item_type: 'emblem',
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcUivB9aSQPRVees2c6cQ0hwIgFot6maKgtr3P33dTxW6d24kY6KhfPxDLbUkmJE5Ytyj-yYo9it3FHg-kE4ZGGnJ4eLMlhpw4R97_c/360fx360f',
    description: 'Коллекционный музейный трофей турнира. Не участвует в коммерческой оценке.',
    estimated_value_minor: null,
  },
];

const SEED_CASES: SeedCase[] = [
  {
    slug: 'starter-radiant-chest',
    name: 'Стартовый ларец Света',
    subtitle: 'Доступный кейс для разминки',
    description: 'Отличный выбор для первых открытий: сбалансированный пул с шансом выбить Serrakura или Golden Basher Blades.',
    category: 'budget',
    price_minor: 9900,
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU0vB9aSV7ESeSoxNvsW1J6KRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    is_featured: true,
    sort_order: 1,
    pool: [
      { itemSlug: 'iron-bear-skullcap', weight: 3800 },
      { itemSlug: 'bracers-of-the-cavern-luminar', weight: 3000 },
      { itemSlug: 'bloodstained-britches', weight: 1800 },
      { itemSlug: 'odachi-fireborn', weight: 900 },
      { itemSlug: 'serrakura', weight: 350 },
      { itemSlug: 'golden-basher-blades', weight: 150 },
    ],
  },
  {
    slug: 'butcher-hook-treasury',
    name: 'Сокровищница Мясника',
    subtitle: 'Коллекция Pudge и редких клинков',
    description: 'Фирменный кейс для охотников за экипировкой Pudge, включая Feast of Abscession и легендарный Dragonclaw Hook.',
    category: 'heroic',
    price_minor: 34900,
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcUivB9aSQPAUuCq0vDAX1h1KRFpob6bJAtv3P33dTxW6d24kY6KhfPxDLfQhG5U5fp9g-7J4bP5iUazrl1rZ2CgIoKLMlhp57zC57Q/360fx360f',
    is_featured: true,
    sort_order: 2,
    pool: [
      { itemSlug: 'bloodstained-britches', weight: 4200 },
      { itemSlug: 'odachi-fireborn', weight: 2800 },
      { itemSlug: 'screeauk-talon', weight: 1500 },
      { itemSlug: 'codicil-of-the-veiled-ones', weight: 900 },
      { itemSlug: 'feast-of-abscession', weight: 500 },
      { itemSlug: 'dragonclaw-hook', weight: 100 },
    ],
  },
  {
    slug: 'immortal-sanctum-vault',
    name: 'Хранилище Immortal',
    subtitle: 'Только высокая редкость и кастомные эффекты',
    description: 'Концентрированный пул предметов Immortal для Juggernaut, Anti-Mage, Sven, Invoker и Faceless Void.',
    category: 'immortal',
    price_minor: 89000,
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcU2rA9YCX3VeOixxIDbUk59NztovbupJAtm1szJcG8SvN3nx9fYwfOmZ77TwW8I6pEn3L2UoY6tigXk-kA9Z2_3J4eLMlhpnG-9j6Y/360fx360f',
    is_featured: true,
    sort_order: 3,
    pool: [
      { itemSlug: 'codicil-of-the-veiled-ones', weight: 3600 },
      { itemSlug: 'serrakura', weight: 3200 },
      { itemSlug: 'golden-basher-blades', weight: 1800 },
      { itemSlug: 'vigil-triumph', weight: 900 },
      { itemSlug: 'dark-artistry-cape', weight: 350 },
      { itemSlug: 'mace-of-aeons', weight: 150 },
    ],
  },
  {
    slug: 'arcana-pantheon-case',
    name: 'Пантеон Arcana',
    subtitle: 'Элитная серия с повышенным шансом Arcana',
    description: 'Флагманский кейс платформы DotaHub: внутри собраны лучшие предметы Arcana для PA, Pudge, Juggernaut, SF, CM и Rubick.',
    category: 'arcana',
    price_minor: 149000,
    image_url: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KW1Zwwo4NUX4oFJZEHLbXK9QlSPcUorA5OA1jTSeSoxNvsW1J6KRFppL2gJAtg0uH3fT8N7c_ik9bNwaP1Z-KAlT8G6pNy2LiZrd2m2wXt-UVrZ2nzJ4SLMlhpTC6b28A/360fx360f',
    is_featured: true,
    sort_order: 4,
    pool: [
      { itemSlug: 'serrakura', weight: 3000 },
      { itemSlug: 'golden-basher-blades', weight: 2500 },
      { itemSlug: 'frost-avalanche', weight: 1200 },
      { itemSlug: 'demon-eater', weight: 1100 },
      { itemSlug: 'bladeform-legacy', weight: 900 },
      { itemSlug: 'feast-of-abscession', weight: 700 },
      { itemSlug: 'magus-cypher', weight: 350 },
      { itemSlug: 'manifold-paradox', weight: 250 },
    ],
  },
];

async function main() {
  console.log('🌱 Старт идемпотентного сидирования базы данных DotaHub...');

  const adminPasswordHash = await hashPassword('Admin1234!');
  const playerPasswordHash = await hashPassword('Player1234!');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dotahub.local' },
    update: { role: 'admin', display_name: 'DotaHub Admin' },
    create: {
      email: 'admin@dotahub.local',
      username: 'admin',
      display_name: 'DotaHub Admin',
      password_hash: adminPasswordHash,
      role: 'admin',
      demo_balance_minor: 1000000,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'player@dotahub.local' },
    update: { display_name: 'Demo Carry' },
    create: {
      email: 'player@dotahub.local',
      username: 'democarry',
      display_name: 'Demo Carry',
      password_hash: playerPasswordHash,
      role: 'user',
      demo_balance_minor: 250000,
    },
  });

  const heroMap = new Map<string, { id: string; localized_name: string }>();
  for (const h of SEED_HEROES) {
    const heroRecord = await prisma.hero.upsert({
      where: { slug: h.slug },
      update: {
        name: h.name,
        localized_name: h.localized_name,
        primary_attr: h.primary_attr,
      },
      create: {
        slug: h.slug,
        name: h.name,
        localized_name: h.localized_name,
        primary_attr: h.primary_attr,
      },
    });
    heroMap.set(h.slug, { id: heroRecord.id, localized_name: heroRecord.localized_name });
  }

  const itemMap = new Map<string, string>();
  for (const it of SEED_ITEMS) {
    const heroInfo = it.hero_slug ? heroMap.get(it.hero_slug) : undefined;
    const itemRecord = await prisma.dotaItem.upsert({
      where: { slug: it.slug },
      update: {
        external_def_id: it.external_def_id,
        name: it.name,
        localized_name: it.localized_name,
        hero_id: heroInfo?.id ?? null,
        hero_slug: it.hero_slug,
        hero_name: heroInfo?.localized_name ?? null,
        rarity: it.rarity,
        quality: it.quality,
        item_type: it.item_type,
        image_url: it.image_url,
        description: it.description,
        estimated_value_minor: it.estimated_value_minor,
        is_active: true,
      },
      create: {
        external_def_id: it.external_def_id,
        slug: it.slug,
        name: it.name,
        localized_name: it.localized_name,
        hero_id: heroInfo?.id ?? null,
        hero_slug: it.hero_slug,
        hero_name: heroInfo?.localized_name ?? null,
        rarity: it.rarity,
        quality: it.quality,
        item_type: it.item_type,
        image_url: it.image_url,
        description: it.description,
        estimated_value_minor: it.estimated_value_minor,
        is_active: true,
      },
    });
    itemMap.set(it.slug, itemRecord.id);
  }

  for (const c of SEED_CASES) {
    const caseRecord = await prisma.caseEntity.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        subtitle: c.subtitle,
        description: c.description,
        category: c.category,
        price_minor: c.price_minor,
        image_url: c.image_url,
        is_featured: c.is_featured,
        is_active: true,
        sort_order: c.sort_order,
      },
      create: {
        slug: c.slug,
        name: c.name,
        subtitle: c.subtitle,
        description: c.description,
        category: c.category,
        price_minor: c.price_minor,
        image_url: c.image_url,
        is_featured: c.is_featured,
        is_active: true,
        sort_order: c.sort_order,
      },
    });

    const totalWeight = c.pool.reduce((acc, p) => acc + p.weight, 0);

    for (const poolEntry of c.pool) {
      const itemId = itemMap.get(poolEntry.itemSlug);
      if (!itemId) continue;

      const chancePercent = Number(((poolEntry.weight / totalWeight) * 100).toFixed(2));

      await prisma.casePoolItem.upsert({
        where: {
          case_id_item_id: {
            case_id: caseRecord.id,
            item_id: itemId,
          },
        },
        update: {
          weight: poolEntry.weight,
          chance_percent: chancePercent,
        },
        create: {
          case_id: caseRecord.id,
          item_id: itemId,
          weight: poolEntry.weight,
          chance_percent: chancePercent,
        },
      });
    }
  }

  await prisma.promoCode.upsert({
    where: { code: 'DOTAHUB2026' },
    update: { reward_amount_minor: 50000, max_uses: 1000, is_active: true },
    create: { code: 'DOTAHUB2026', reward_amount_minor: 50000, max_uses: 1000, is_active: true },
  });

  await prisma.promoCode.upsert({
    where: { code: 'WELCOME250' },
    update: { reward_amount_minor: 25000, max_uses: null, is_active: true },
    create: { code: 'WELCOME250', reward_amount_minor: 25000, max_uses: null, is_active: true },
  });

  const existingInvCount = await prisma.inventoryItem.count({
    where: { user_id: demoUser.id },
  });

  if (existingInvCount === 0) {
    for (const slug of ['bloodstained-britches', 'odachi-fireborn']) {
      const itemId = itemMap.get(slug);
      if (itemId) {
        await prisma.inventoryItem.create({
          data: {
            user_id: demoUser.id,
            item_id: itemId,
            status: 'available',
            acquired_source: 'admin_grant',
          },
        });
      }
    }
  }

  console.log(
    `✅ Сидирование завершено! Созданы аккаунты: ${adminUser.email} и ${demoUser.email}.`
  );
}

main()
  .catch((err) => {
    console.error('❌ Ошибка выполнения src/prisma/seed.ts:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });