/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as collections from "../collections.js";
import type * as companies from "../companies.js";
import type * as customers from "../customers.js";
import type * as dateUtils from "../dateUtils.js";
import type * as http from "../http.js";
import type * as installmentAgreements from "../installmentAgreements.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as roles from "../roles.js";
import type * as router from "../router.js";
import type * as settings from "../settings.js";
import type * as sizes from "../sizes.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  collections: typeof collections;
  companies: typeof companies;
  customers: typeof customers;
  dateUtils: typeof dateUtils;
  http: typeof http;
  installmentAgreements: typeof installmentAgreements;
  orders: typeof orders;
  products: typeof products;
  roles: typeof roles;
  router: typeof router;
  settings: typeof settings;
  sizes: typeof sizes;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
