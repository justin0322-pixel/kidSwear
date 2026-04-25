/**
 * Seed 腳本：執行方式
 *   cd backend && pnpm prisma:seed
 *
 * 注意：此檔為獨立 Node.js 腳本，非 NestJS 應用程式的一部分，
 * 故允許使用 console.log 輸出執行進度。
 */
import {
  PrismaClient,
  Prisma,
  UserRole,
  UserStatus,
  ProductStatus,
  ProductGender,
  DiscountType,
  OrderStatus,
} from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const BCRYPT_COST = 12

// ── 公共標籤 ────────────────────────────────────────────────────────────────

async function seedPublicTags(): Promise<void> {
  const existing = await prisma.tag.count({ where: { shopId: null } })
  if (existing > 0) {
    console.log(`  跳過公共標籤（已存在 ${existing} 筆）`)
    return
  }

  await prisma.tag.createMany({
    data: [
      { shopId: null, name: '可愛', category: '風格', color: '#FFB6C1' },
      { shopId: null, name: '卡通', category: '風格', color: '#FFD700' },
      { shopId: null, name: '寬版', category: '版型', color: '#87CEEB' },
      { shopId: null, name: '素色', category: '風格', color: '#F5F5DC' },
      { shopId: null, name: '條紋', category: '圖案', color: '#90EE90' },
      { shopId: null, name: '蕾絲', category: '材質', color: '#DDA0DD' },
      { shopId: null, name: '運動風', category: '風格', color: '#FF6347' },
      { shopId: null, name: '韓系', category: '風格', color: '#FFA07A' },
    ],
  })
  console.log('  ✓ 公共標籤（8 筆）')
}

// ── 帳號 ────────────────────────────────────────────────────────────────────

async function seedWholesaler(): Promise<void> {
  const email = 'wholesaler@test.com'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`  跳過批發商帳號（已存在）`)
    return
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('Test1234!', BCRYPT_COST),
      role: UserRole.wholesaler,
      status: UserStatus.active,
      wholesaler: {
        create: {
          companyName: '可愛童裝批發',
          contactPerson: '王小明',
          address: '台北市信義區松仁路 100 號',
          verifiedAt: new Date(),
          shop: {
            create: {
              name: '可愛童裝批發行',
              slug: 'cute-kids-wholesale',
              description: '專業童裝批發，品質保證，款式多樣，適合各年齡層兒童',
              minOrderAmount: new Prisma.Decimal('1000.00'),
              isActive: true,
              isVipOnly: false,
            },
          },
        },
      },
    },
  })
  console.log(`  ✓ 批發商帳號：${email}`)
}

async function seedWholesaler2(): Promise<void> {
  const email = 'wholesaler2@test.com'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`  跳過第二批發商帳號（已存在）`)
    return
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('Test1234!', BCRYPT_COST),
      role: UserRole.wholesaler,
      status: UserStatus.active,
      wholesaler: {
        create: {
          companyName: '時尚兒童服飾有限公司',
          contactPerson: '陳雅婷',
          address: '台中市西屯區台灣大道三段 500 號',
          verifiedAt: new Date(),
          shop: {
            create: {
              name: '時尚兒童精品館',
              slug: 'fashion-kids',
              description: '精選高品質韓系童裝，VIP 會員專屬優惠，讓寶貝穿出時尚感',
              minOrderAmount: new Prisma.Decimal('2000.00'),
              isActive: true,
              isVipOnly: true,
            },
          },
        },
      },
    },
  })
  console.log(`  ✓ 第二批發商帳號：${email}（VIP 商城）`)
}

async function seedRetailer(): Promise<void> {
  const email = 'retailer@test.com'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`  跳過零售商帳號（已存在）`)
    return
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('Test1234!', BCRYPT_COST),
      role: UserRole.retailer,
      status: UserStatus.active,
      retailer: {
        create: {
          shopName: '小熊寶貝童裝店',
          contactPerson: '李美華',
          shippingAddress: '新北市板橋區中山路一段 100 號',
        },
      },
    },
  })
  console.log(`  ✓ 零售商帳號：${email}`)
}

async function seedRetailer2(): Promise<void> {
  const email = 'retailer2@test.com'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`  跳過第二零售商帳號（已存在）`)
    return
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('Test1234!', BCRYPT_COST),
      role: UserRole.retailer,
      status: UserStatus.active,
      retailer: {
        create: {
          shopName: '陽光寶貝童裝',
          contactPerson: '張志豪',
          shippingAddress: '台中市北區三民路三段 200 號',
        },
      },
    },
  })
  console.log(`  ✓ 第二零售商帳號：${email}`)
}

async function seedRetailer3(): Promise<void> {
  const email = 'retailer3@test.com'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`  跳過第三零售商帳號（已存在）`)
    return
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('Test1234!', BCRYPT_COST),
      role: UserRole.retailer,
      status: UserStatus.active,
      retailer: {
        create: {
          shopName: '快樂小天地童裝',
          contactPerson: '林佳穎',
          shippingAddress: '高雄市前鎮區中山二路 300 號',
        },
      },
    },
  })
  console.log(`  ✓ 第三零售商帳號：${email}（時尚兒童 VIP）`)
}

async function seedAdmin(): Promise<void> {
  const email = 'admin@test.com'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`  跳過管理員帳號（已存在）`)
    return
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('Admin1234!', BCRYPT_COST),
      role: UserRole.admin,
      status: UserStatus.active,
    },
  })
  console.log(`  ✓ 管理員帳號：${email}`)
}

// ── 商品（商城一：可愛童裝批發行）────────────────────────────────────────

async function seedShop1Products(): Promise<void> {
  const shop = await prisma.shop.findUnique({ where: { slug: 'cute-kids-wholesale' } })
  if (!shop) {
    console.log('  跳過商城一商品（找不到商城）')
    return
  }

  const existing = await prisma.product.count({ where: { shopId: shop.id, deletedAt: null } })
  if (existing > 0) {
    console.log(`  跳過商城一商品（已存在 ${existing} 筆）`)
    return
  }

  // 取得公共標籤
  const tags = await prisma.tag.findMany({ where: { shopId: null } })
  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t.id]))

  type ProductSeed = {
    name: string
    description: string
    category: string
    ageRange: string
    gender: ProductGender
    basePrice: string
    suggestedRetailPrice: string
    imageSeeds: number[]
    tagNames: string[]
    variants: { size: string; color: string; stock: number }[]
  }

  const products: ProductSeed[] = [
    {
      name: '小熊條紋長袖上衣',
      description: '純棉材質，柔軟舒適，條紋設計活潑可愛，適合春秋穿著。',
      category: '上衣',
      ageRange: '3-6歲',
      gender: ProductGender.unisex,
      basePrice: '280',
      suggestedRetailPrice: '480',
      imageSeeds: [10, 20, 30],
      tagNames: ['條紋', '可愛'],
      variants: [
        { size: '100cm', color: '藍白條', stock: 30 },
        { size: '100cm', color: '紅白條', stock: 25 },
        { size: '110cm', color: '藍白條', stock: 20 },
        { size: '110cm', color: '紅白條', stock: 18 },
        { size: '120cm', color: '藍白條', stock: 15 },
      ],
    },
    {
      name: '公主蕾絲洋裝',
      description: '精緻蕾絲拼接，腰部綁帶設計，穿起來像小公主一樣優雅。',
      category: '洋裝',
      ageRange: '4-8歲',
      gender: ProductGender.girl,
      basePrice: '420',
      suggestedRetailPrice: '720',
      imageSeeds: [40, 50, 60],
      tagNames: ['蕾絲', '可愛'],
      variants: [
        { size: '110cm', color: '粉紅', stock: 20 },
        { size: '110cm', color: '白色', stock: 15 },
        { size: '120cm', color: '粉紅', stock: 18 },
        { size: '120cm', color: '白色', stock: 12 },
        { size: '130cm', color: '粉紅', stock: 10 },
      ],
    },
    {
      name: '恐龍印花運動套裝',
      description: '透氣速乾面料，彈力設計方便活動，帥氣恐龍印花男童最愛。',
      category: '套裝',
      ageRange: '3-7歲',
      gender: ProductGender.boy,
      basePrice: '380',
      suggestedRetailPrice: '680',
      imageSeeds: [70, 80, 90],
      tagNames: ['運動風', '卡通'],
      variants: [
        { size: '100cm', color: '藍色', stock: 25 },
        { size: '100cm', color: '綠色', stock: 20 },
        { size: '110cm', color: '藍色', stock: 22 },
        { size: '110cm', color: '綠色', stock: 18 },
        { size: '120cm', color: '藍色', stock: 15 },
      ],
    },
    {
      name: '素色寬版連帽衫',
      description: '厚棉質料，保暖舒適，寬鬆版型不限制孩子活動，多色可選。',
      category: '外套',
      ageRange: '5-10歲',
      gender: ProductGender.unisex,
      basePrice: '320',
      suggestedRetailPrice: '550',
      imageSeeds: [100, 110, 120],
      tagNames: ['素色', '寬版'],
      variants: [
        { size: '120cm', color: '灰色', stock: 30 },
        { size: '120cm', color: '米白', stock: 25 },
        { size: '130cm', color: '灰色', stock: 28 },
        { size: '130cm', color: '米白', stock: 22 },
        { size: '140cm', color: '灰色', stock: 20 },
      ],
    },
    {
      name: '韓系花朵短裙',
      description: '清新花朵印花，蓬蓬裙設計，春夏必備，甜美風格讓小女孩愛不釋手。',
      category: '裙子',
      ageRange: '3-8歲',
      gender: ProductGender.girl,
      basePrice: '240',
      suggestedRetailPrice: '420',
      imageSeeds: [130, 140, 150],
      tagNames: ['韓系', '可愛'],
      variants: [
        { size: '100cm', color: '粉色', stock: 35 },
        { size: '100cm', color: '黃色', stock: 28 },
        { size: '110cm', color: '粉色', stock: 30 },
        { size: '110cm', color: '黃色', stock: 24 },
        { size: '120cm', color: '粉色', stock: 20 },
      ],
    },
  ]

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        name: p.name,
        description: p.description,
        category: p.category,
        ageRange: p.ageRange,
        gender: p.gender,
        basePrice: new Prisma.Decimal(p.basePrice),
        suggestedRetailPrice: new Prisma.Decimal(p.suggestedRetailPrice),
        status: ProductStatus.active,
        skuPrefix: p.name.slice(0, 4).replace(/\s/g, ''),
        variants: {
          create: p.variants.map((v, i) => ({
            sku: `${p.name.slice(0, 3)}-${v.size}-${v.color}-${i + 1}`,
            size: v.size,
            color: v.color,
            stock: v.stock,
          })),
        },
        images: {
          create: p.imageSeeds.map((seed, i) => ({
            url: `https://picsum.photos/seed/${seed}/400/400`,
            altText: `${p.name} 圖 ${i + 1}`,
            sortOrder: i,
            isPrimary: i === 0,
          })),
        },
        productTags: {
          create: p.tagNames
            .filter((n) => tagMap[n])
            .map((n) => ({ tagId: tagMap[n] })),
        },
      },
    })
    console.log(`    商品：${product.name}`)
  }
  console.log('  ✓ 商城一商品（5 筆）')
}

// ── 商品（商城二：時尚兒童精品館 VIP-only）──────────────────────────────

async function seedShop2Products(): Promise<void> {
  const shop = await prisma.shop.findUnique({ where: { slug: 'fashion-kids' } })
  if (!shop) {
    console.log('  跳過商城二商品（找不到商城）')
    return
  }

  const existing = await prisma.product.count({ where: { shopId: shop.id, deletedAt: null } })
  if (existing > 0) {
    console.log(`  跳過商城二商品（已存在 ${existing} 筆）`)
    return
  }

  const tags = await prisma.tag.findMany({ where: { shopId: null } })
  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t.id]))

  type ProductSeed = {
    name: string
    description: string
    category: string
    ageRange: string
    gender: ProductGender
    basePrice: string
    suggestedRetailPrice: string
    imageSeeds: number[]
    tagNames: string[]
    variants: { size: string; color: string; stock: number }[]
  }

  const products: ProductSeed[] = [
    {
      name: '韓系格紋毛呢外套',
      description: '進口毛呢面料，精緻格紋設計，小翻領剪裁，讓孩子秋冬也能時尚有型。',
      category: '外套',
      ageRange: '4-9歲',
      gender: ProductGender.unisex,
      basePrice: '680',
      suggestedRetailPrice: '1200',
      imageSeeds: [160, 170, 180],
      tagNames: ['韓系'],
      variants: [
        { size: '110cm', color: '卡其', stock: 15 },
        { size: '110cm', color: '深藍', stock: 12 },
        { size: '120cm', color: '卡其', stock: 14 },
        { size: '120cm', color: '深藍', stock: 10 },
        { size: '130cm', color: '卡其', stock: 10 },
      ],
    },
    {
      name: '甜美荷葉邊連身裙',
      description: '柔順雪紡材質，多層荷葉邊設計，公主感十足，適合節日或拍照穿著。',
      category: '洋裝',
      ageRange: '3-8歲',
      gender: ProductGender.girl,
      basePrice: '520',
      suggestedRetailPrice: '950',
      imageSeeds: [190, 200, 210],
      tagNames: ['可愛', '韓系'],
      variants: [
        { size: '100cm', color: '香芋紫', stock: 18 },
        { size: '100cm', color: '天藍', stock: 15 },
        { size: '110cm', color: '香芋紫', stock: 16 },
        { size: '110cm', color: '天藍', stock: 13 },
        { size: '120cm', color: '香芋紫', stock: 12 },
      ],
    },
    {
      name: '帥氣工裝褲套組',
      description: '多口袋設計，耐磨棉布材質，機能又時尚，搭配同款上衣效果更佳。',
      category: '套裝',
      ageRange: '4-10歲',
      gender: ProductGender.boy,
      basePrice: '460',
      suggestedRetailPrice: '820',
      imageSeeds: [220, 230, 240],
      tagNames: ['韓系'],
      variants: [
        { size: '110cm', color: '橄欖綠', stock: 20 },
        { size: '110cm', color: '卡其', stock: 18 },
        { size: '120cm', color: '橄欖綠', stock: 17 },
        { size: '120cm', color: '卡其', stock: 15 },
        { size: '130cm', color: '橄欖綠', stock: 12 },
      ],
    },
    {
      name: '精緻刺繡 Polo 衫',
      description: '高級棉混紡，胸口精緻刺繡，修身版型，兼具休閒與正式的百搭款。',
      category: '上衣',
      ageRange: '5-12歲',
      gender: ProductGender.unisex,
      basePrice: '380',
      suggestedRetailPrice: '680',
      imageSeeds: [250, 260, 270],
      tagNames: ['韓系', '素色'],
      variants: [
        { size: '120cm', color: '白色', stock: 25 },
        { size: '120cm', color: '藏青', stock: 20 },
        { size: '130cm', color: '白色', stock: 22 },
        { size: '130cm', color: '藏青', stock: 18 },
        { size: '140cm', color: '白色', stock: 15 },
      ],
    },
    {
      name: '芭蕾風蓬蓬紗裙',
      description: '多層薄紗堆疊，腰部鬆緊帶設計，穿脫方便，粉色系超級少女心。',
      category: '裙子',
      ageRange: '3-9歲',
      gender: ProductGender.girl,
      basePrice: '290',
      suggestedRetailPrice: '520',
      imageSeeds: [280, 290, 300],
      tagNames: ['可愛', '蕾絲'],
      variants: [
        { size: '100cm', color: '玫瑰粉', stock: 30 },
        { size: '100cm', color: '薄荷綠', stock: 25 },
        { size: '110cm', color: '玫瑰粉', stock: 28 },
        { size: '110cm', color: '薄荷綠', stock: 22 },
        { size: '120cm', color: '玫瑰粉', stock: 18 },
      ],
    },
  ]

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        name: p.name,
        description: p.description,
        category: p.category,
        ageRange: p.ageRange,
        gender: p.gender,
        basePrice: new Prisma.Decimal(p.basePrice),
        suggestedRetailPrice: new Prisma.Decimal(p.suggestedRetailPrice),
        status: ProductStatus.active,
        skuPrefix: p.name.slice(0, 4).replace(/\s/g, ''),
        variants: {
          create: p.variants.map((v, i) => ({
            sku: `FK-${p.name.slice(0, 3)}-${v.size}-${v.color}-${i + 1}`,
            size: v.size,
            color: v.color,
            stock: v.stock,
          })),
        },
        images: {
          create: p.imageSeeds.map((seed, i) => ({
            url: `https://picsum.photos/seed/${seed}/400/400`,
            altText: `${p.name} 圖 ${i + 1}`,
            sortOrder: i,
            isPrimary: i === 0,
          })),
        },
        productTags: {
          create: p.tagNames
            .filter((n) => tagMap[n])
            .map((n) => ({ tagId: tagMap[n] })),
        },
      },
    })
    console.log(`    商品：${product.name}`)
  }
  console.log('  ✓ 商城二商品（5 筆）')
}

// ── VIP 關係與折扣 ───────────────────────────────────────────────────────

async function seedVipData(): Promise<void> {
  const shop2 = await prisma.shop.findUnique({ where: { slug: 'fashion-kids' } })
  if (!shop2) {
    console.log('  跳過 VIP 資料（找不到商城）')
    return
  }

  const retailer3User = await prisma.user.findUnique({
    where: { email: 'retailer3@test.com' },
    include: { retailer: true },
  })
  if (!retailer3User?.retailer) {
    console.log('  跳過 VIP 資料（找不到零售商3）')
    return
  }

  // VIP 成員資格
  const existingMembership = await prisma.shopVipMember.findUnique({
    where: { shopId_retailerId: { shopId: shop2.id, retailerId: retailer3User.retailer.id } },
  })
  if (!existingMembership) {
    await prisma.shopVipMember.create({
      data: { shopId: shop2.id, retailerId: retailer3User.retailer.id },
    })
    console.log('  ✓ VIP 成員：retailer3 → 時尚兒童精品館')
  } else {
    console.log('  跳過 VIP 成員（已存在）')
  }

  // VIP 折扣：商城二第一個商品的所有規格設定 10% 折扣
  const firstProduct = await prisma.product.findFirst({
    where: { shopId: shop2.id, deletedAt: null },
    include: { variants: { take: 3 } },
    orderBy: { createdAt: 'asc' },
  })
  if (!firstProduct) return

  let discountCount = 0
  for (const variant of firstProduct.variants) {
    const exists = await prisma.variantVipDiscount.findUnique({
      where: { variantId_shopId: { variantId: variant.id, shopId: shop2.id } },
    })
    if (!exists) {
      await prisma.variantVipDiscount.create({
        data: {
          variantId: variant.id,
          shopId: shop2.id,
          discountType: DiscountType.percentage,
          discountValue: new Prisma.Decimal('10'),
        },
      })
      discountCount++
    }
  }

  // 第二個商品第一個規格設定固定折扣 50 元
  const secondProduct = await prisma.product.findFirst({
    where: { shopId: shop2.id, deletedAt: null },
    include: { variants: { take: 1 } },
    orderBy: { createdAt: 'asc' },
    skip: 1,
  })
  if (secondProduct?.variants[0]) {
    const variant = secondProduct.variants[0]
    const exists = await prisma.variantVipDiscount.findUnique({
      where: { variantId_shopId: { variantId: variant.id, shopId: shop2.id } },
    })
    if (!exists) {
      await prisma.variantVipDiscount.create({
        data: {
          variantId: variant.id,
          shopId: shop2.id,
          discountType: DiscountType.fixed,
          discountValue: new Prisma.Decimal('50'),
        },
      })
      discountCount++
    }
  }

  if (discountCount > 0) {
    console.log(`  ✓ VIP 折扣（${discountCount} 筆）`)
  } else {
    console.log('  跳過 VIP 折扣（已存在）')
  }
}

// ── 訂單 ────────────────────────────────────────────────────────────────────

async function seedOrders(): Promise<void> {
  const existing = await prisma.order.count()
  if (existing > 0) {
    console.log(`  跳過訂單（已存在 ${existing} 筆）`)
    return
  }

  // 取出所需帳號
  const r1User = await prisma.user.findUnique({
    where: { email: 'retailer@test.com' },
    include: { retailer: true },
  })
  const r2User = await prisma.user.findUnique({
    where: { email: 'retailer2@test.com' },
    include: { retailer: true },
  })
  const r3User = await prisma.user.findUnique({
    where: { email: 'retailer3@test.com' },
    include: { retailer: true },
  })
  const shop1 = await prisma.shop.findUnique({ where: { slug: 'cute-kids-wholesale' } })
  const shop2 = await prisma.shop.findUnique({ where: { slug: 'fashion-kids' } })

  if (!r1User?.retailer || !r2User?.retailer || !r3User?.retailer || !shop1 || !shop2) {
    console.log('  跳過訂單（缺少帳號或商城）')
    return
  }

  // 取商城一前兩個商品的第一個規格
  const shop1Variants = await prisma.productVariant.findMany({
    where: { product: { shopId: shop1.id, deletedAt: null } },
    include: { product: true },
    take: 6,
  })

  // 取商城二前兩個商品的第一個規格
  const shop2Variants = await prisma.productVariant.findMany({
    where: { product: { shopId: shop2.id, deletedAt: null } },
    include: { product: true },
    take: 4,
  })

  if (shop1Variants.length < 2 || shop2Variants.length < 2) {
    console.log('  跳過訂單（商品規格不足）')
    return
  }

  type OrderSeed = {
    orderNumber: string
    retailerId: bigint
    shopId: bigint
    status: OrderStatus
    shippingAddress: string
    contactName: string
    contactPhone: string
    paidAt?: Date
    shippedAt?: Date
    completedAt?: Date
    items: { variant: typeof shop1Variants[0]; qty: number }[]
  }

  const now = new Date()
  const daysAgo = (n: number): Date => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    return d
  }

  const orders: OrderSeed[] = [
    // 商城一 — 已完成訂單（零售商1）
    {
      orderNumber: 'ORD-2026-000001',
      retailerId: r1User.retailer.id,
      shopId: shop1.id,
      status: OrderStatus.completed,
      shippingAddress: '新北市板橋區中山路一段 100 號',
      contactName: '李美華',
      contactPhone: '0912-345-678',
      paidAt: daysAgo(30),
      shippedAt: daysAgo(28),
      completedAt: daysAgo(21),
      items: [
        { variant: shop1Variants[0], qty: 10 },
        { variant: shop1Variants[1], qty: 8 },
      ],
    },
    // 商城一 — 已付款處理中（零售商1）
    {
      orderNumber: 'ORD-2026-000002',
      retailerId: r1User.retailer.id,
      shopId: shop1.id,
      status: OrderStatus.paid,
      shippingAddress: '新北市板橋區中山路一段 100 號',
      contactName: '李美華',
      contactPhone: '0912-345-678',
      paidAt: daysAgo(5),
      items: [
        { variant: shop1Variants[2], qty: 5 },
        { variant: shop1Variants[3], qty: 6 },
      ],
    },
    // 商城一 — 待付款（零售商1）
    {
      orderNumber: 'ORD-2026-000003',
      retailerId: r1User.retailer.id,
      shopId: shop1.id,
      status: OrderStatus.pending,
      shippingAddress: '新北市板橋區中山路一段 100 號',
      contactName: '李美華',
      contactPhone: '0912-345-678',
      items: [
        { variant: shop1Variants[4], qty: 12 },
      ],
    },
    // 商城一 — 已完成訂單（零售商2）
    {
      orderNumber: 'ORD-2026-000004',
      retailerId: r2User.retailer.id,
      shopId: shop1.id,
      status: OrderStatus.completed,
      shippingAddress: '台中市北區三民路三段 200 號',
      contactName: '張志豪',
      contactPhone: '0923-456-789',
      paidAt: daysAgo(20),
      shippedAt: daysAgo(18),
      completedAt: daysAgo(10),
      items: [
        { variant: shop1Variants[0], qty: 15 },
        { variant: shop1Variants[2], qty: 10 },
      ],
    },
    // 商城二 — 已出貨（零售商3 VIP）
    {
      orderNumber: 'ORD-2026-000005',
      retailerId: r3User.retailer.id,
      shopId: shop2.id,
      status: OrderStatus.shipped,
      shippingAddress: '高雄市前鎮區中山二路 300 號',
      contactName: '林佳穎',
      contactPhone: '0934-567-890',
      paidAt: daysAgo(10),
      shippedAt: daysAgo(7),
      items: [
        { variant: shop2Variants[0], qty: 8 },
        { variant: shop2Variants[1], qty: 6 },
      ],
    },
    // 商城二 — 待付款（零售商3 VIP）
    {
      orderNumber: 'ORD-2026-000006',
      retailerId: r3User.retailer.id,
      shopId: shop2.id,
      status: OrderStatus.pending,
      shippingAddress: '高雄市前鎮區中山二路 300 號',
      contactName: '林佳穎',
      contactPhone: '0934-567-890',
      items: [
        { variant: shop2Variants[2], qty: 5 },
        { variant: shop2Variants[3], qty: 4 },
      ],
    },
  ]

  for (const o of orders) {
    const subtotal = o.items.reduce((sum, item) => {
      const price = item.variant.product.basePrice
      return sum.add(price.mul(item.qty))
    }, new Prisma.Decimal(0))

    const shippingFee = new Prisma.Decimal('100')
    const total = subtotal.add(shippingFee)

    await prisma.order.create({
      data: {
        orderNumber: o.orderNumber,
        retailerId: o.retailerId,
        shopId: o.shopId,
        subtotal,
        shippingFee,
        discount: new Prisma.Decimal(0),
        total,
        status: o.status,
        shippingAddress: o.shippingAddress,
        contactName: o.contactName,
        contactPhone: o.contactPhone,
        paidAt: o.paidAt,
        shippedAt: o.shippedAt,
        completedAt: o.completedAt,
        items: {
          create: o.items.map((item) => ({
            variantId: item.variant.id,
            productName: item.variant.product.name,
            sku: item.variant.sku,
            size: item.variant.size,
            color: item.variant.color,
            unitPrice: item.variant.product.basePrice,
            quantity: item.qty,
            subtotal: item.variant.product.basePrice.mul(item.qty),
          })),
        },
      },
    })
    console.log(`    訂單：${o.orderNumber} [${o.status}]`)
  }
  console.log('  ✓ 訂單（6 筆）')
}

// ── 主流程 ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 開始 Seed 資料...\n')

  console.log('📌 公共標籤')
  await seedPublicTags()

  console.log('\n👤 帳號')
  await seedWholesaler()
  await seedWholesaler2()
  await seedRetailer()
  await seedRetailer2()
  await seedRetailer3()
  await seedAdmin()

  console.log('\n📦 商品')
  await seedShop1Products()
  await seedShop2Products()

  console.log('\n⭐ VIP 資料')
  await seedVipData()

  console.log('\n🛍️  訂單')
  await seedOrders()

  console.log('\n🎉 Seed 完成！')
  console.log('\n測試帳號（密碼統一 Test1234!，管理員 Admin1234!）：')
  console.log('  批發商  wholesaler@test.com   可愛童裝批發行（一般商城）')
  console.log('  批發商  wholesaler2@test.com  時尚兒童精品館（VIP 商城）')
  console.log('  零售商  retailer@test.com     小熊寶貝童裝店')
  console.log('  零售商  retailer2@test.com    陽光寶貝童裝')
  console.log('  零售商  retailer3@test.com    快樂小天地童裝（時尚兒童 VIP）')
  console.log('  管理員  admin@test.com        Admin1234!')
}

main()
  .catch((e: unknown) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
