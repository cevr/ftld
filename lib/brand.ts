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

type Unbranded<P> = P extends infer Q & Brands<P> ? Q : P;

// credit to EffectTs/Data/Brand
interface Brander<in out K extends string | symbol> {
  readonly [BrandSymbol]: {
    readonly [k in K]: K;
  };
}

export type Brand<A, K extends string | symbol = typeof BrandSymbol> = A &
  Brander<K>;

type NominalBrandConstructor<A> = (value: Unbranded<A>) => A;

type RefinedBrandConstructor<A> = (
  value: Unbranded<A>
) => Result<BrandError, A>;

type MultiRefinedBrandConstructor<A> = (
  value: Unbranded<A>
) => Result<BrandError[], A>;

type BrandConstructor<A> =
  | NominalBrandConstructor<A>
  | RefinedBrandConstructor<A>
  | MultiRefinedBrandConstructor<A>;

export interface BrandError {
  message: string;
}

// @ts-expect-error
export const Brand: {
  <TBrand>(): NominalBrandConstructor<TBrand>;
  <TBrand>(refiner?: {
    validate: (value: Unbranded<TBrand>) => boolean;
    onErr: (value: Unbranded<TBrand>) => BrandError;
  }): RefinedBrandConstructor<TBrand>;
  all<
    TBrands extends readonly [BrandConstructor<any>, ...BrandConstructor<any>[]]
  >(
    ...brands: EnsureCommonBase<TBrands>
  ): MultiRefinedBrandConstructor<
    UnionToIntersection<
      { [B in keyof TBrands]: FromBrandConstructor<TBrands[B]> }[number]
    > extends infer X extends Brand<any>
      ? X
      : Brand<any>
  >;
  Error: (message: string) => BrandError;
} = (refiner) => (value) => {
  if (refiner) {
    return Result.fromPredicate(refiner.validate, refiner.onErr(value), value);
  }
  return value;
};

Brand.all =
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

Brand.Error = (message) => ({ message });

type EnsureCommonBase<
  Brands extends readonly [BrandConstructor<any>, ...BrandConstructor<any>[]]
> = {
  [B in keyof Brands]: Unbranded<
    FromBrandConstructor<Brands[0]>
  > extends Unbranded<FromBrandConstructor<Brands[B]>>
    ? Unbranded<FromBrandConstructor<Brands[B]>> extends Unbranded<
        FromBrandConstructor<Brands[0]>
      >
      ? Brands[B]
      : Brands[B]
    : "ERROR: All brands should have the same base type";
};

type FromBrandConstructor<A> = A extends BrandConstructor<infer B> ? B : never;
