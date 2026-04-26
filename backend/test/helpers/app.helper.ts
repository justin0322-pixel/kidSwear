/// <reference types="jest" />
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockPrisma = Record<string, any>;

export function buildMockPrisma(): MockPrisma {
  return {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    wholesaler: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    retailer: { create: jest.fn(), findUnique: jest.fn() },
    shop: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    product: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
    productVariant: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    productImage: { createMany: jest.fn() },
    productTag: { createMany: jest.fn(), deleteMany: jest.fn() },
    tag: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    order: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
    orderStatusHistory: { create: jest.fn() },
    shopVipMember: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
    variantVipDiscount: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    userOauthAccount: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
}

export async function createTestApp(prisma: MockPrisma): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = module.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return app;
}
