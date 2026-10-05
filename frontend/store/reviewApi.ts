import {openapi} from "./openApiSdk";

export const reviewApi = openapi.injectEndpoints({
  endpoints: (build) => ({
    focussessionsReviewSkip: build.mutation<{data?: object}, string>({
      invalidatesTags: ["focussessions"],
      query: (id) => ({
        method: "POST",
        url: `/focusSessions/${id}/review/skip`,
      }),
    }),
  }),
});

export const {useFocussessionsReviewSkipMutation} = reviewApi;
