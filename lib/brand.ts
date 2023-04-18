import { Result } from "./result";

const BrandSymbol: unique symbol = Symbol.for("ftld/Brand");

type BrandId = typeof BrandSymbol;

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

type Brands<P> = P extends Brander<any>
  ? UnionToIntersection<
      {
        [k in keyof P[BrandId]]: k extends string | symbol ? Brander<k> : never;
      }[keyof P[BrandId]]
    >
  : never;

export type Unbrand<P> = P extends infer Q & Brands<P> ? Q : P;

// credit to EffectTs/Data/Brand
interface Brander<in out K extends string | symbol> {
  readonly [BrandSymbol]: {
    readonly [k in K]: K;
  };
}

export type Brand<A, K extends string | symbol = typeof BrandSymbol> = A &
  Brander<K>;

export namespace Brand {
  export type Infer<A> = A extends Brand<infer B>
    ? B
    : A extends BrandConstructor<infer B>
    ? B
    : never;
}

type NominalBrandConstructor<A> = (value: Unbrand<A>) => A;

type ValidatedBrandConstructor<A> = (
  value: Unbrand<A>
) => Result<BrandError, A>;

type ComposedBrandConstructor<A> = (
  value: Unbrand<A>
) => Result<BrandError[], A>;

type BrandConstructor<A> =
  | NominalBrandConstructor<A>
  | ValidatedBrandConstructor<A>
  | ComposedBrandConstructor<A>;

export interface BrandError {
  message: string;
  meta?: Record<string, unknown>;
}

// @ts-expect-error
export const Brand: {
  <TBrand>(): NominalBrandConstructor<TBrand>;
  <TBrand>(refiner?: {
    validate: (value: Unbrand<TBrand>) => boolean;
    onErr: (value: Unbrand<TBrand>) => BrandError;
  }): ValidatedBrandConstructor<TBrand>;
  compose<
    TBrands extends readonly [BrandConstructor<any>, ...BrandConstructor<any>[]]
  >(
    ...brands: EnsureCommonBase<TBrands>
  ): ComposedBrandConstructor<
    UnionToIntersection<
      { [B in keyof TBrands]: FromBrandConstructor<TBrands[B]> }[number]
    > extends infer X extends Brand<any>
      ? X
      : Brand<any>
  >;
  Error: (message: string, meta?: Record<string, unknown>) => BrandError;
} = (refiner) => (value) => {
  if (refiner) {
    return Result.fromPredicate(refiner.validate, refiner.onErr(value), value);
  }
  return value;
};

Brand.compose =
  (...brands) =>
  (value) => {
    const errors = [];
    for (const brand of brands) {
      const result = brand(value);
      if (result.isErr()) {
        errors.push(result.unwrapErr());
      }
    }
    if (errors.length > 0) {
      return Result.Err(errors.flat());
    }
    return Result.Ok(value) as any;
  };

Brand.Error = (message, meta) => ({ message, meta });

type EnsureCommonBase<
  TBrands extends readonly [BrandConstructor<any>, ...BrandConstructor<any>[]]
> = {
  [B in keyof TBrands]: Unbrand<FromBrandConstructor<TBrands[0]>> extends Unbrand<
    FromBrandConstructor<TBrands[B]>
  >
    ? Unbrand<FromBrandConstructor<TBrands[B]>> extends Unbrand<
        FromBrandConstructor<TBrands[0]>
      >
      ? TBrands[B]
      : TBrands[B]
    : "ERROR: All brands should have the same base type";
};

type FromBrandConstructor<A> = A extends BrandConstructor<infer B> ? B : never;
