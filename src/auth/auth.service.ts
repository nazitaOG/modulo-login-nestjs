import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, JwtPayload } from './interfaces/auth.interfaces';
import * as argon2 from 'argon2';
import { v7 as uuidv7 } from 'uuid';
import { Prisma, User, Role } from '@prisma/client';

type UserWithRoles = User & { roles: Role[] };

@Injectable()
export class AuthService {
  // El Pepper se guarda en memoria (Buffer) para no leer process.env en cada request.
  // Es la "segunda mitad" de la llave que hace inútil el robo de la DB.
  private readonly pepper: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly logger: Logger,
  ) {
    // 1. FAIL FAST: Si no hay Pepper, la app no debe arrancar.
    // Esto previene que por un error de configuración deployemos algo inseguro.
    const pepperString = process.env.AUTH_PEPPER;
    if (!pepperString) {
      throw new Error(
        'FATAL: AUTH_PEPPER no está configurado en variables de entorno.',
      );
    }
    this.pepper = Buffer.from(pepperString);
  }

  /**
   * REGISTRO TRANSACCIONAL
   * Crea User + Security + Conexión de Rol en una operación atómica.
   */
  async register(dto: RegisterDto): Promise<User> {
    // 2. Validación de Negocio: No duplicar emails.
    const exists = await this.userService.exists(dto.email);
    if (exists) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    let hashedPassword: string;

    try {
      hashedPassword = await argon2.hash(dto.password, {
        type: argon2.argon2id, // El mejor algoritmo híbrido

        // MEMORIA: La defensa principal contra GPUs.
        // Estándar seguro 2026: 128 MB (2^17) a 256 MB (2^18).
        // Si tu server tiene < 1GB de RAM, bajalo a 2^16.
        memoryCost: 2 ** 17, // 131.072 KB (128 MB)

        // TIEMPO: Cantidad de pasadas sobre la memoria.
        // Más alto = Más tiempo de CPU.
        // Objetivo: Que el proceso tarde ~500ms - 800ms.
        timeCost: 10,

        // PARALELISMO: Hilos de CPU.
        // En Node.js (single thread event loop), no queremos bloquear todo.
        // Mantenlo bajo para no ahogar el servidor si hay muchos logins.
        parallelism: 1,

        // PEPPER: La defensa contra robo de DB.
        secret: this.pepper,
      });
    } catch (error) {
      // Análisis del error para el SysAdmin
      if (error instanceof Error) {
        this.logger.error(
          `Fallo crítico en Argon2 (Hashing). Posible falta de memoria o error de librería nativa.`,
          error.stack,
        );

        // Si el error es por memoria (común con 2**18), el mensaje suele contener "memory" o "allocation"
        if (
          error.message &&
          (error.message.includes('memory') ||
            error.message.includes('allocation'))
        ) {
          throw new InternalServerErrorException(
            'El servidor está temporalmente sobrecargado. Intente más tarde.',
          );
        }
      }
      // Lo logueamos como string genérico
      else {
        this.logger.error('Error desconocido al hashear', String(error));
      }

      // 3. Fallback final para el cliente
      throw new InternalServerErrorException(
        'Error interno de seguridad al procesar credenciales.',
      );
    }

    // 4. TRANSACCIÓN ATÓMICA
    // Usamos transaction para garantizar integridad: O se crea todo, o no se crea nada.
    try {
      const newUser = await this.prisma.$transaction(async (tx) => {
        // 5. GENERACIÓN DE ID (UUIDv7)
        // Generamos el ID en la APP, no en la DB.
        // Al ser v7 (Time-ordered), Postgres lo indexa secuencialmente.
        // Evita la fragmentación del índice B-Tree que causa el UUIDv4.
        const userId = uuidv7();

        return tx.user.create({
          data: {
            id: userId, // ID Secuencial
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,

            // 6. ESCRITURA ANIDADA (Security)
            // Creamos la password en la tabla separada en el mismo query.
            security: {
              create: {
                id: uuidv7(),
                password: hashedPassword,
              },
            },

            // 7. ASIGNACIÓN DE ROL (RBAC)
            // Conectamos al usuario con el rol 'USER' que ya debe existir (Seed).
            // Usamos 'connect' porque es una relación N:N.
            roles: {
              connect: {
                name: 'USER',
              },
            },
          },
          // Incluimos roles en el retorno para que el frontend actualice su estado
          include: {
            roles: true,
          },
        });
      });

      return newUser;
    } catch (error) {
      // ------------------------------------------------------------
      // MANEJO DE ERRORES DE PRISMA (DB)
      // ------------------------------------------------------------
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: VIOLACIÓN DE UNIQUE (Race Condition)
        // Aunque chequeamos 'exists()' arriba, en sistemas de alto tráfico
        // otro request pudo haber ganado en el milisegundo intermedio.
        if (error.code === 'P2002') {
          // Confirmamos que el campo duplicado sea el email
          const target = error.meta?.target as string[];
          if (target && target.includes('email')) {
            this.logger.warn(
              `Intento de registro duplicado (Race Condition): ${dto.email}`,
            );
            throw new ConflictException(
              'El correo electrónico ya está registrado.',
            );
          }
        }

        // P2025: RECORD NOT FOUND (Falta el Seed)
        // Esto pasa si intentamos conectar el rol 'USER' y la tabla roles está vacía.
        if (error.code === 'P2025') {
          this.logger.error(
            'FATAL: No se encuentra el rol "USER". Ejecutar seed de DB.',
          );
          throw new InternalServerErrorException(
            'Error de configuración del sistema (Roles).',
          );
        }
      }

      // ------------------------------------------------------------
      // ERROR DESCONOCIDO (Catch-All)
      // ------------------------------------------------------------
      this.logger.error(
        'Error no controlado en transacción de registro',
        error,
      );
      throw new InternalServerErrorException(
        'No se pudo completar el registro. Intente nuevamente.',
      );
    }
  }

  /**
   * LOGIN
   * Valida credenciales y emite JWT firmado.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    // 1. Validar Usuario (Lógica encapsulada)
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      // Mensaje genérico para no revelar existencia de cuentas (Seguridad por oscuridad)
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Mapeo de Roles
    // 'user' viene de validateUser, que hace un include de roles.
    // Hacemos un cast seguro o usamos optional chaining para extraer los nombres.
    // Esto evita enviar objetos completos de Prisma dentro del Token.
    const userRoles = user.roles.map((role) => role.name);
    // 3. Creación del Payload (Contrato Estricto)
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: userRoles, // Array de strings: ['USER', 'ADMIN']
    };

    // 4. Firma del Token
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user, // Retornamos el usuario limpio (sin password)
    };
  }

  /**
   * VALIDATE USER (Helper Privado)
   * Busca usuario + seguridad, valida hash + pepper, y devuelve usuario limpio.
   */
  private async validateUser(
    email: string,
    pass: string,
  ): Promise<UserWithRoles | null> {
    const userWithRelations = await this.prisma.user.findUnique({
      where: { email },
      include: {
        security: true,
        roles: true,
      },
    });

    if (!userWithRelations) return null;
    if (!userWithRelations.isActive) return null;
    if (!userWithRelations.security || !userWithRelations.security.password) {
      return null;
    }

    const isValid = await argon2.verify(
      userWithRelations.security.password,
      pass,
      {
        secret: this.pepper,
      },
    );

    if (!isValid) return null;

    // 1. Clonamos el objeto para no mutar el original
    const userResult = { ...userWithRelations };

    // 2. Eliminamos la propiedad de forma segura para el linter
    // En lugar de 'as any', usamos 'as Partial<typeof userResult>'
    // Esto le dice a TS: "Tratalo como si sus propiedades fueran opcionales para poder borrar una"
    delete (userResult as Partial<typeof userResult>).security;

    // 3. Retornamos con el tipo limpio
    return userResult as UserWithRoles;
  }
}
