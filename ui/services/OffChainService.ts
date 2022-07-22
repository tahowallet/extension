import { OffChainAccount, OffChainAccountCredentials, OffChainChallenge, OffChainProvider } from "@tallyho/tally-background/accounts";
import { OffChainAsset } from "@tallyho/tally-background/assets";

export class OffChainService {

    static login({provider, credentials }: {provider: OffChainProvider,credentials: OffChainAccountCredentials}): Promise<OffChainAccount | OffChainChallenge> {
        // const apiResponsePromise = fetch(`https://mocki.io/v1/d14997dd-ea1d-496a-b3ca-f6576201a9f3`, {
        const apiResponsePromise = fetch(`${provider.apiUrl}/api/v1/login`, {
            method: 'POST',
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Referrer': document.location.origin,
            },
            body: JSON.stringify({...credentials}),
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

    static assets({ provider, userId = ""}: { provider: OffChainProvider, userId: string}): Promise<{provider: OffChainProvider, assets: OffChainAsset[]}> {
        const token = localStorage.getItem('token');
        // const apiResponsePromise = fetch(`https://mocki.io/v1/6f412ee4-2875-4764-bbdc-eefada21ec2a`, {
        const apiResponsePromise = fetch(`${provider.apiUrl}/api/v1/assets?user_id=${userId}`, {
            method: 'GET',
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Referrer': document.location.origin,
            'Authorization': `JWT ${token}`,
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