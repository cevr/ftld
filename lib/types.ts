/* eslint-disable no-await-in-loop */
export declare const URI: unique symbol;

export interface Typeclass<HigherKindedType extends HKT> {
  readonly [URI]?: HigherKindedType;
}

export interface HKT {
  readonly ResourceType?: unknown;
  readonly ErrorType?: unknown;
  readonly ValueType?: unknown;
  readonly type?: unknown;
}

export type Kind<
  HigherKindedType extends HKT,
  ResourceType,
  ErrorType,
  ValueType,
> = (HigherKindedType & {
  readonly ResourceType: ResourceType;
  readonly ErrorType: ErrorType;
  readonly ValueType: ValueType;
})['type'];

// Functor
export interface Functor<F extends HKT, R, E, A> {
  map<B>(f: (a: A) => B): Functor<F, R, E, B>;
}

// Applicative
export interface Applicative<F extends HKT, R, E, A> extends Functor<F, R, E, A> {
  ap<B>(fab: Applicative<F, R, E, (a: A) => B>): Applicative<F, R, E, B>;
  of(value: A): Applicative<F, R, E, A>;
}

// Monad
export interface Monad<F extends HKT, R, E, A> extends Applicative<F, R, E, A> {
  flatMap<B>(f: (a: A) => Monad<F, R, E, B>): Monad<F, R, E, B>;
}

// Semigroup
export interface Semigroup<A> {
  concat(other: Semigroup<A>): Semigroup<A>;
}

// Monoid
export interface Monoid<A> extends Semigroup<A> {
  empty(): Monoid<A>;
}

export interface Foldable<A> {
  unwrap(): A;
  unwrapOr<B>(value: B): A | B;
  reduce<B>(f: (b: B, a: A) => B, b: B): B;
}
