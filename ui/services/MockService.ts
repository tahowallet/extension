import { resolveConfig } from "prettier";
import { DEFAULT_ASSETS } from "./spec/assets";
import { DEFAULT_TRANSFER_CONFIRMATION_MATIC } from "./spec/transfer";

const { fetch: originalFetch } = window;

export const initializeAPIMocks  = () => {

    console.log("initializeAPIMocks", initializeAPIMocks);

    window.fetch = async (...args) => {
        let [resource, config ] = args;
        console.log({args, resource, config}, "resource.toString()", resource.toString());

        if (resource.toString().includes('/v1/assets')) {
            return updateResponseJSON(config!, {assets: DEFAULT_ASSETS});
         };

         if (resource.toString().includes('/v1/transfer')) {
            return updateResponseJSON(config!, DEFAULT_TRANSFER_CONFIRMATION_MATIC);
          };
    
        return originalFetch(resource, config);
        // response interceptor here
        // return response;
    };


}

export const updateResponseJSON = async (config: RequestInit, newData: any, resource = 'https://reqres.in/api/users') => {

    let originalResponse = await originalFetch(resource, config);
    return originalResponse
    .clone()
    .json()
    .then((data: any) => (newData));
}
