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

            resource = 'https://jsonplaceholder.typicode.com/todos/2';
            let response = await originalFetch(resource, config);
            response.json = updateResponseJSON(response, DEFAULT_ASSETS);;
            return response;
         };

         if (resource.toString().includes('/v1/transfer')) {
             resource = 'https://jsonplaceholder.typicode.com/todos/2';
             let response = await originalFetch(resource, config);
             response.json = updateResponseJSON(response, DEFAULT_TRANSFER_CONFIRMATION_MATIC);;
             return response;
          };
    
        return originalFetch(resource, config);
        // response interceptor here
        // return response;
    };


}

export const updateResponseJSON = (originalResponse: Response, newData: any) => {
    return () => originalResponse
    .clone()
    .json()
    .then((data: any) => (newData));
}
