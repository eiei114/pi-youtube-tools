import { Type, type TEnum, type TSchemaOptions } from "typebox";

export function StringEnum<const Values extends [string, ...string[]]>(
  values: readonly [...Values],
  options?: TSchemaOptions,
): TEnum<Values> {
  return Type.Enum([...values] as [string, ...string[]], options) as unknown as TEnum<Values>;
}
