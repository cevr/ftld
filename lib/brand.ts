// credit to EffectTs/Data/Brand
import { Result } from "./result";

// @ts-expect-error
export const Brand: {
  /**
   * Create a validated brand constructor that checks the value using the provided validation function.
   */
  <E, TBrand>(
    validate: (value: Unbrand<TBrand>) => boolean,
    onErr: (value: Unbrand<TBrand>) => E
  ): ValidatedBrandConstructor<E, TBrand>;

  /**
   * Create a nominal brand constructor.
   */
  <TBrand>(): NominalBrandConstructor<TBrand>;

  /**
   * Compose multiple brand constructors into a single brand constructor.
   */
  compose<
    TBrands extends readonly [
      BrandConstructor<any, any>,
      ...BrandConstructor<any, any>[]
    ]
  >(
    ...brands: EnsureCommonBase<TBrands>
  ): ComposedBrandConstructor<
    {
      [B in keyof TBrands]: PickErrorFromBrandConstructor<TBrands[B]>;
    }[number],
    UnionToIntersection<
      { [B in keyof TBrands]: PickBrandFromConstructor<TBrands[B]> }[number]
    > extends infer X extends Brand<any>
      ? X
      : Brand<any>
  >;
} = (validate, onErr) => (value) => {
  if (validate) {
    return Result.fromPredicate(value, validate, onErr);
  }
  return value;
};

Brand.compose =
  (...brands) =>
  (value) => {
    const results = brands.map((brand) => brand(value));

    return Result.validate(results as any) as any;
  };

type EnsureCommonBase<
  TBrands extends readonly [
    BrandConstructor<any, any>,
    ...BrandConstructor<any, any>[]
  ]
> = {
  [B in keyof TBrands]: Unbrand<
    PickBrandFromConstructor<TBrands[0]>
  > extends Unbrand<PickBrandFromConstructor<TBrands[B]>>
    ? Unbrand<PickBrandFromConstructor<TBrands[B]>> extends Unbrand<
        PickBrandFromConstructor<TBrands[0]>
      >
      ? TBrands[B]
      : TBrands[B]
    : "ERROR: All brands should have the same base type";
};

declare const BrandSymbol: unique symbol;

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

export type Brand<A, K extends string | symbol = typeof BrandSymbol> = A &
  Brander<K>;

export namespace Brand {
  export type Infer<A> = A extends Brand<infer B>
    ? B
    : A extends BrandConstructor<unknown, infer B>
    ? B
    : never;
}

interface Brander<in out K extends string | symbol> {
  readonly [BrandSymbol]: {
    readonly [k in K]: K;
  };
}

type NominalBrandConstructor<A> = (value: Unbrand<A>) => A;

type ValidatedBrandConstructor<E, A> = (value: Unbrand<A>) => Result<E, A>;

type ComposedBrandConstructor<E, A> = (value: Unbrand<A>) => Result<E[], A>;

type BrandConstructor<E, A> =
  | NominalBrandConstructor<A>
  | ValidatedBrandConstructor<E, A>
  | ComposedBrandConstructor<E, A>;

type PickErrorFromBrandConstructor<BC> = BC extends BrandConstructor<
  infer E,
  infer _A
>
  ? E
  : never;

type PickBrandFromConstructor<BC> = BC extends BrandConstructor<
  infer _E,
  infer A
>
  ? A
  : never;
