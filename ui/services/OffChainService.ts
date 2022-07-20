import { OffChainAccountCredentials, OffChainProvider } from "@tallyho/tally-background/accounts";
import { OffChainAsset } from "@tallyho/tally-background/redux-slices/assets";

export class OffChainService {

    static login({provider, credentials }: {provider: OffChainProvider,credentials: OffChainAccountCredentials}): Promise<{assets: OffChainAsset[]}> {
        const apiResponsePromise = fetch(`https://mocki.io/v1/d14997dd-ea1d-496a-b3ca-f6576201a9f3`, {
        // const apiResponsePromise = fetch(`${provider}/api/v1/login`, {
            method: 'GET',
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Referrer': document.location.origin
            }
        })
        .then(response => {
        try {
            return response.json()
        } catch(e) {
            return response
        }
        });

        return apiResponsePromise
    }

    static assets({ userId = ""}): Promise<{assets: OffChainAsset[]}> {
        // const apiResponsePromise = fetch(`https://mocki.io/v1/13770a8a-231a-46fd-9acd-f337b42e0436`, {
        const apiResponsePromise = fetch(`http://192.168.1.120:8000/api/v1/balances?user_id=${userId}`, {
            method: 'GET',
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Referrer': document.location.origin
            }
        })
        .then(response => {
        try {
            return response.json()
        } catch(e) {
            return response
        }
        });

        return apiResponsePromise
    }
}