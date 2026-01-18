import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOneField', async: false })
class AtLeastOneFieldConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    const fields = (args.constraints ?? []) as string[];
    return fields.some((f) => obj[f] !== undefined && obj[f] !== null);
  }

  defaultMessage(args: ValidationArguments): string {
    const fields = (args.constraints ?? []) as string[];
    return `Debe proporcionar al menos uno de los siguientes campos: ${fields.join(', ')}`;
  }
}

export function AtLeastOneField(fields: string[], options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'atLeastOneField',
      target: object.constructor,
      propertyName,
      constraints: fields,
      options,
      validator: AtLeastOneFieldConstraint,
    });
  };
}
