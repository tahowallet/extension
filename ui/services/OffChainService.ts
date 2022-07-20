import { OffChainAccount, OffChainAccountCredentials, OffChainProvider } from "@tallyho/tally-background/accounts";
import { OffChainAsset } from "@tallyho/tally-background/assets";

export class OffChainService {

    static login({provider, credentials }: {provider: OffChainProvider,credentials: OffChainAccountCredentials}): Promise<OffChainAccount> {
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
        const token = localStorage.getItem('token');
        const apiResponsePromise = fetch(`https://mocki.io/v1/6f412ee4-2875-4764-bbdc-eefada21ec2a`, {
        // const apiResponsePromise = fetch(`http://192.168.1.120:8000/api/v1/balances?user_id=${userId}`, {
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