import { OffChainAsset } from "@tallyho/tally-background/redux-slices/assets";

export class OffChainService {

    static assets({ user_id = ""}): Promise<{accounts: OffChainAsset[]}> {
        // const apiResponsePromise = fetch(`http:localhost:8000/api/v1/balances`, {
        const apiResponsePromise = fetch(`https://mocki.io/v1/13770a8a-231a-46fd-9acd-f337b42e0436`, {
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