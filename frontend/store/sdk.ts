import type {AdminScreenProps} from "@terreno/admin-frontend";
import {generateTags} from "@terreno/rtk";
import startCase from "lodash/startCase";

import {addTagTypes, openapi} from "./openApiSdk";

/** emptyApi unwraps the `data` envelope — profile fields are top-level on the response. */
export interface ProfileResponse {
  _id: string;
  id: string;
  email: string;
  name: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  password?: string;
}

export const terrenoApi = openapi
  .enhanceEndpoints({
    addTagTypes: ["profile"],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getMe: builder.query<ProfileResponse, void>({
        providesTags: ["profile"],
        query: () => ({
          method: "GET",
          url: "/auth/me",
        }),
      }),
      patchMe: builder.mutation<ProfileResponse, UpdateProfileRequest>({
        invalidatesTags: ["profile"],
        query: (body) => ({
          body,
          method: "PATCH",
          url: "/auth/me",
        }),
      }),
    }),
  })
  .enhanceEndpoints({
    endpoints: {
      ...generateTags(openapi, [...addTagTypes]),
    },
  });

/** Type-erased API instance for @terreno/admin-frontend screens. */
export const adminTerrenoApi = terrenoApi as unknown as AdminScreenProps["api"];

export const {useGetMeQuery, usePatchMeMutation} = terrenoApi;
export * from "./openApiSdk";

type OpenApiEndpoints = Record<string, unknown>;

export const getSdkHook = (
  modelName: string,
  type: "list" | "read" | "create" | "update" | "remove"
): Record<string, unknown> => {
  const modelPath = startCase(modelName).replace(/\s/g, "");
  const endpoints = openapi.endpoints as OpenApiEndpoints;
  switch (type) {
    case "list":
      return endpoints[`get${modelPath}`] as Record<string, unknown>;
    case "read":
      return endpoints[`get${modelPath}ById`] as Record<string, unknown>;
    case "create":
      return endpoints[`post${modelPath}`] as Record<string, unknown>;
    case "update":
      return endpoints[`patch${modelPath}ById`] as Record<string, unknown>;
    case "remove":
      return endpoints[`delete${modelPath}ById`] as Record<string, unknown>;
    default:
      throw new Error(`Invalid SDK hook: ${modelName}/${type}`);
  }
};
