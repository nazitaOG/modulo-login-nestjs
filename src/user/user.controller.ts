import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /users?email=test@example.com
   * Busca un usuario por su identificador de negocio (email).
   */
  @Get()
  getByEmail(@Query('email') email?: string) {
    if (!email) {
      throw new BadRequestException(
        'Se requiere el parámetro email para la búsqueda',
      );
    }
    return this.userService.findOneByEmail(email);
  }

  /**
   * GET /users/:id
   * Busca un usuario por su identificador único (UUIDv7).
   */
  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.userService.findOneById(id);
  }

  /**
   * PATCH /users/:id
   * Actualiza datos de perfil. El DTO asegura que no se cambie el email aquí.
   */
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateProfile(id, updateUserDto);
  }
}
