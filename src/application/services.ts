import type { AuthService, ProductRepository, ProfileRepository } from "@/domain/ports";

/** Everything the application layer may depend on. Built once per request by the composition root. */
export interface Services {
  products: ProductRepository;
  profiles: ProfileRepository;
  auth: AuthService;
}
