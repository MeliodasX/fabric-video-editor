type Resolver = (specifier: string, context: object, next: Resolver) => Promise<{ url: string }>;

export const resolve: Resolver = (specifier, context, next) => {
  if (specifier === "fabric") return next("fabric/node", context, next);
  return next(specifier, context, next);
};
