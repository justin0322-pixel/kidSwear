import { Injectable } from '@nestjs/common'
import { User, Wholesaler, Retailer } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export type UserWithProfile = User & {
  wholesaler: Wholesaler | null
  retailer: Retailer | null
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    })
  }

  async findById(id: bigint): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
  }

  async findByIdWithProfile(id: bigint): Promise<UserWithProfile | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { wholesaler: true, retailer: true },
    })
  }
}
