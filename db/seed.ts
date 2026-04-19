/**
 * Seed 腳本：執行方式
 *   cd backend && pnpm prisma:seed
 *
 * 注意：此檔為獨立 Node.js 腳本，非 NestJS 應用程式的一部分，
 * 故允許使用 console.log 輸出執行進度。
 */
import { PrismaClient, Prisma, UserRole, UserStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const BCRYPT_COST = 12

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
              description: '專業童裝批發，品質保證，款式多樣',
              minOrderAmount: new Prisma.Decimal('1000.00'),
              isActive: true,
            },
          },
        },
      },
    },
  })
  console.log(`  ✓ 批發商帳號：${email}`)
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

async function main(): Promise<void> {
  console.log('🌱 開始 Seed 資料...\n')

  await seedPublicTags()
  await seedWholesaler()
  await seedRetailer()
  await seedAdmin()

  console.log('\n🎉 Seed 完成！')
  console.log('\n測試帳號：')
  console.log('  批發商  wholesaler@test.com  / Test1234!')
  console.log('  零售商  retailer@test.com    / Test1234!')
  console.log('  管理員  admin@test.com       / Admin1234!')
}

main()
  .catch((e: unknown) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
