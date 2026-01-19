import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // Búsqueda por ID (Usado por el Controller y Guards)
  async findOneById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    });
    if (!user)
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    return user;
  }

  // Búsqueda por Email (Usado para chequeos de identidad)
  async findOneByEmail(email: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: true,
      },
    });
    if (!user)
      throw new NotFoundException(`Usuario con email ${email} no encontrado`);
    return user;
  }

  // Actualización de perfil (Solo campos permitidos en el DTO)
  async updateProfile(id: string, dto: UpdateUserDto): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof Object &&
        'code' in error &&
        (error as { code: string }).code === 'P2025'
      )
        throw new NotFoundException('Usuario no existe');
      throw new InternalServerErrorException('Error al actualizar el perfil');
    }
  }

  // Método interno para el AuthService (Verificar existencia antes de registrar)
  async exists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }
}
